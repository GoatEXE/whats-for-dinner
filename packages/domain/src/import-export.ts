import { ZodError } from "zod";

import {
  importBodySchema,
  mealWriteSchema,
  type MealWrite,
} from "@whats-for-dinner/contracts";
import { HttpError } from "./errors";
import { normalizeName } from "./normalize";

export interface ImportedMealSummary {
  id?: number;
  name: string;
}

export interface ImportSkippedMeal {
  name: string;
  reason: "duplicate";
}

export interface ImportFailedMeal {
  name: string | null;
  reason: string;
}

export interface ImportMealsOptions {
  existingMeals?: Array<string | { name: string }>;
  importMeal?: (meal: MealWrite) => ImportedMealSummary;
}

export function formatValidationIssue(issue: ZodError["issues"][number]) {
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export function formatMealValidationError(error: ZodError) {
  return `Validation: ${error.issues.map(formatValidationIssue).join("; ")}`;
}

export function getImportMealName(candidate: unknown) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const name = (candidate as { name?: unknown }).name;

  if (typeof name !== "string") {
    return null;
  }

  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

function buildExistingNormalizedNameSet(existingMeals: ImportMealsOptions["existingMeals"]) {
  return new Set(
    (existingMeals ?? []).map((meal) =>
      normalizeName(typeof meal === "string" ? meal : meal.name),
    ),
  );
}

export function exportMealsEnvelope(
  meals: Array<{
    name: string;
    notes?: string | null;
    prepMinutes?: number | null;
    isFavorite?: boolean;
    tags?: string[];
    ingredients: Array<{
      name: string;
      quantityText?: string | null;
      isOptional?: boolean;
    }>;
  }>,
  exportedAt = new Date().toISOString(),
) {
  return {
    format: "whats-for-dinner-recipes" as const,
    version: 1 as const,
    exportedAt,
    meals: meals.map((meal) => ({
      name: meal.name,
      notes: meal.notes,
      prepMinutes: meal.prepMinutes,
      isFavorite: meal.isFavorite,
      tags: meal.tags,
      ingredients: meal.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantityText: ingredient.quantityText,
        isOptional: ingredient.isOptional,
      })),
    })),
  };
}

export function importMeals(payload: unknown, options: ImportMealsOptions = {}) {
  const parsedEnvelope = importBodySchema.safeParse(payload);

  if (!parsedEnvelope.success) {
    throw new HttpError(400, "Validation failed", parsedEnvelope.error.flatten());
  }

  const imported: ImportedMealSummary[] = [];
  const skipped: ImportSkippedMeal[] = [];
  const failed: ImportFailedMeal[] = [];
  const existingNames = buildExistingNormalizedNameSet(options.existingMeals);

  for (const candidate of parsedEnvelope.data.meals) {
    const parsedMeal = mealWriteSchema.safeParse(candidate);

    if (!parsedMeal.success) {
      failed.push({
        name: getImportMealName(candidate),
        reason: formatMealValidationError(parsedMeal.error),
      });
      continue;
    }

    const normalizedName = normalizeName(parsedMeal.data.name);

    if (existingNames.has(normalizedName)) {
      skipped.push({
        name: parsedMeal.data.name,
        reason: "duplicate",
      });
      continue;
    }

    try {
      const importedMeal = options.importMeal?.(parsedMeal.data) ?? {
        name: parsedMeal.data.name,
      };

      imported.push(importedMeal);
      existingNames.add(normalizedName);
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 409) {
        skipped.push({
          name: parsedMeal.data.name,
          reason: "duplicate",
        });
        existingNames.add(normalizedName);
        continue;
      }

      throw error;
    }
  }

  return {
    data: {
      imported,
      skipped,
      failed,
      summary: {
        importedCount: imported.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        totalCount: parsedEnvelope.data.meals.length,
      },
    },
  };
}
