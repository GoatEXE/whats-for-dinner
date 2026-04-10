import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { exportMealsEnvelope, importMeals } from "@whats-for-dinner/domain";

import * as mealsRepo from "@/db/repos/meals-repo";
import type { DatabaseHandle, MealWriteInput } from "@/db/types";

import { createTestDb, type TestDatabaseContext } from "../helpers/test-db";

function importFromJson(db: DatabaseHandle, jsonString: string) {
  try {
    const payload = JSON.parse(jsonString);
    const existingMeals = mealsRepo.getAll(db).map((meal) => ({ name: meal.name }));
    const importResult = importMeals(payload, {
      existingMeals,
      importMeal: (mealData) => {
        const input: MealWriteInput = {
          name: mealData.name,
          notes: mealData.notes ?? null,
          prepMinutes: mealData.prepMinutes ?? null,
          isFavorite: mealData.isFavorite ?? false,
          ingredients: mealData.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantityText: ingredient.quantityText ?? null,
            isOptional: ingredient.isOptional ?? false,
          })),
          tags: mealData.tags ?? [],
        };

        const created = mealsRepo.create(db, input);
        return { name: created.name };
      },
    });

    return {
      result: importResult.data,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      error: error instanceof SyntaxError
        ? "Invalid JSON file"
        : error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

describe("mobile import flow", () => {
  let context: TestDatabaseContext;

  beforeEach(() => {
    context = createTestDb();
  });

  afterEach(() => {
    context.close();
  });

  it("imports a valid recipe envelope and creates meals in the database", () => {
    const payload = exportMealsEnvelope([
      {
        name: "Import Chili",
        notes: "Freezer-friendly",
        prepMinutes: 30,
        isFavorite: true,
        tags: ["comfort"],
        ingredients: [
          { name: "Ground beef", quantityText: "1 lb" },
          { name: "Beans", quantityText: "2 cans" },
        ],
      },
      {
        name: "Veggie Stir Fry",
        notes: null,
        prepMinutes: 20,
        isFavorite: false,
        tags: ["quick"],
        ingredients: [
          { name: "Broccoli", quantityText: "2 cups" },
          { name: "Soy sauce", quantityText: "2 tbsp" },
        ],
      },
    ]);

    const { result, error } = importFromJson(context.db, JSON.stringify(payload));
    const meals = mealsRepo.getAll(context.db);

    expect(error).toBeNull();
    expect(result).toMatchObject({
      imported: [{ name: "Import Chili" }, { name: "Veggie Stir Fry" }],
      skipped: [],
      failed: [],
      summary: {
        importedCount: 2,
        skippedCount: 0,
        failedCount: 0,
        totalCount: 2,
      },
    });
    expect(meals.map((meal) => meal.name)).toEqual(["Import Chili", "Veggie Stir Fry"]);
    expect(meals[0]?.ingredients.map((ingredient) => ingredient.name)).toEqual([
      "Ground beef",
      "Beans",
    ]);
  });

  it("skips duplicate meals during import", () => {
    mealsRepo.create(context.db, {
      name: "Test Chili",
      ingredients: [{ name: "Beans", quantityText: "2 cans" }],
      tags: [],
    });

    const payload = exportMealsEnvelope([
      {
        name: "  Test   Chili  ",
        ingredients: [{ name: "Ground beef", quantityText: "1 lb" }],
      },
      {
        name: "Fresh Salad",
        ingredients: [{ name: "Lettuce", quantityText: "1 head" }],
      },
    ]);

    const { result, error } = importFromJson(context.db, JSON.stringify(payload));
    const meals = mealsRepo.getAll(context.db);

    expect(error).toBeNull();
    expect(result).toMatchObject({
      imported: [{ name: "Fresh Salad" }],
      skipped: [{ name: "Test   Chili", reason: "duplicate" }],
      failed: [],
      summary: {
        importedCount: 1,
        skippedCount: 1,
        failedCount: 0,
        totalCount: 2,
      },
    });
    expect(meals.map((meal) => meal.name)).toEqual(["Fresh Salad", "Test Chili"]);
  });

  it("returns an error for invalid JSON", () => {
    const { result, error } = importFromJson(context.db, "{not valid json");

    expect(result).toBeNull();
    expect(error).toBe("Invalid JSON file");
    expect(mealsRepo.getAll(context.db)).toEqual([]);
  });
});
