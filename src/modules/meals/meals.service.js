const Database = require("better-sqlite3");
const { HttpError } = require("../../lib/errors");
const { normalizeName } = require("../../lib/normalize");
const { importBodySchema, mealWriteSchema } = require("./meals.schemas");

function formatValidationIssue(issue) {
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

function formatMealValidationError(error) {
  return `Validation: ${error.issues.map(formatValidationIssue).join("; ")}`;
}

function getImportMealName(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  if (typeof candidate.name !== "string") {
    return null;
  }

  const trimmedName = candidate.name.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

function createMealsService(mealsRepo) {
  function listMeals(filters) {
    return mealsRepo.listMeals(filters);
  }

  function exportMeals() {
    return {
      format: "whats-for-dinner-recipes",
      version: 1,
      exportedAt: new Date().toISOString(),
      meals: listMeals().map((meal) => ({
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

  function getMealById(id) {
    const meal = mealsRepo.getMealById(id);

    if (!meal) {
      throw new HttpError(404, "Meal not found");
    }

    return meal;
  }

  function createMeal(payload) {
    try {
      return mealsRepo.createMeal({
        ...payload,
        tags: payload.tags ?? [],
      });
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new HttpError(409, "A meal with that name already exists");
      }

      throw error;
    }
  }

  function updateMeal(id, payload) {
    const existing = getMealById(id);
    const merged = {
      ...existing,
      ...payload,
      tags: payload.tags ?? existing.tags,
      ingredients:
        payload.ingredients ??
        existing.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantityText: ingredient.quantityText,
          isOptional: ingredient.isOptional,
        })),
    };

    try {
      return mealsRepo.updateMeal(id, merged);
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new HttpError(409, "A meal with that name already exists");
      }

      throw error;
    }
  }

  // Recipe import implementation.
  function importMeals(payload) {
    const parsedEnvelope = importBodySchema.safeParse(payload);

    if (!parsedEnvelope.success) {
      throw new HttpError(400, "Validation failed", parsedEnvelope.error.flatten());
    }

    const imported = [];
    const skipped = [];
    const failed = [];

    for (const candidate of parsedEnvelope.data.meals) {
      const parsedMeal = mealWriteSchema.safeParse(candidate);

      if (!parsedMeal.success) {
        failed.push({
          name: getImportMealName(candidate),
          reason: formatMealValidationError(parsedMeal.error),
        });
        continue;
      }

      const existing = mealsRepo.findByNormalizedName(
        normalizeName(parsedMeal.data.name),
      );

      if (existing) {
        skipped.push({
          name: parsedMeal.data.name,
          reason: "duplicate",
        });
        continue;
      }

      try {
        const meal = createMeal(parsedMeal.data);
        imported.push({ id: meal.id, name: meal.name });
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 409) {
          skipped.push({
            name: parsedMeal.data.name,
            reason: "duplicate",
          });
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

  function toggleFavorite(id, isFavorite) {
    const existing = getMealById(id);
    const nextValue =
      typeof isFavorite === "boolean" ? isFavorite : !existing.isFavorite;
    return mealsRepo.setFavorite(id, nextValue);
  }

  function archiveMeal(id) {
    getMealById(id);
    return mealsRepo.archiveMeal(id);
  }

  return {
    listMeals,
    exportMeals,
    getMealById,
    createMeal,
    updateMeal,
    importMeals,
    toggleFavorite,
    archiveMeal,
  };
}

module.exports = {
  createMealsService,
};
