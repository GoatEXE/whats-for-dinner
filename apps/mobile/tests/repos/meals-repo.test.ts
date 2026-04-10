import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as mealsRepo from "@/db/repos/meals-repo";

import { createTestDb, type TestDatabaseContext } from "../helpers/test-db";

describe("meals repo", () => {
  let context: TestDatabaseContext;

  beforeEach(() => {
    context = createTestDb();
  });

  afterEach(() => {
    context.close();
  });

  it("create inserts a meal with ingredients and tags", () => {
    const meal = mealsRepo.create(context.db, {
      name: "Sheet Pan Sausage",
      notes: "Add peppers near the end",
      prepMinutes: 35,
      isFavorite: true,
      ingredients: [
        { name: "Sausage", quantityText: "1 lb" },
        { name: "Bell peppers", quantityText: "3", isOptional: true },
      ],
      tags: ["quick", "comfort"],
    });

    expect(meal).toMatchObject({
      name: "Sheet Pan Sausage",
      normalizedName: "sheet pan sausage",
      notes: "Add peppers near the end",
      prepMinutes: 35,
      isFavorite: true,
      isArchived: false,
    });
    expect(meal.ingredients).toEqual([
      expect.objectContaining({
        name: "Sausage",
        normalizedName: "sausage",
        quantityText: "1 lb",
        isOptional: false,
        sortOrder: 0,
      }),
      expect.objectContaining({
        name: "Bell peppers",
        normalizedName: "bell peppers",
        quantityText: "3",
        isOptional: true,
        sortOrder: 1,
      }),
    ]);
    expect(meal.tags).toEqual(["comfort", "quick"]);
  });

  it("getAll returns meals with populated ingredients", () => {
    mealsRepo.create(context.db, {
      name: "Baked Ziti",
      notes: null,
      prepMinutes: 45,
      ingredients: [
        { name: "Pasta", quantityText: "1 box" },
        { name: "Mozzarella", quantityText: "8 oz" },
      ],
      tags: ["family"],
    });

    const meals = mealsRepo.getAll(context.db);

    expect(meals).toHaveLength(1);
    expect(meals[0]).toMatchObject({
      name: "Baked Ziti",
      ingredients: [
        expect.objectContaining({ name: "Pasta", quantityText: "1 box", sortOrder: 0 }),
        expect.objectContaining({ name: "Mozzarella", quantityText: "8 oz", sortOrder: 1 }),
      ],
    });
  });

  it("toggleFavorite flips the favorite flag", () => {
    const meal = mealsRepo.create(context.db, {
      name: "Tacos",
      ingredients: [{ name: "Tortillas", quantityText: "8" }],
      tags: [],
    });

    const favorited = mealsRepo.toggleFavorite(context.db, meal.id);
    const unfavorited = mealsRepo.toggleFavorite(context.db, meal.id);

    expect(favorited?.isFavorite).toBe(true);
    expect(unfavorited?.isFavorite).toBe(false);
  });

  it("archive marks a meal as archived and excludes it from the default list", () => {
    const meal = mealsRepo.create(context.db, {
      name: "Chili",
      ingredients: [{ name: "Beans", quantityText: "2 cans" }],
      tags: ["comfort"],
    });

    const archived = mealsRepo.archive(context.db, meal.id);
    const activeMeals = mealsRepo.getAll(context.db);
    const archivedMeals = mealsRepo.getAll(context.db, { archived: true });

    expect(archived?.isArchived).toBe(true);
    expect(activeMeals).toHaveLength(0);
    expect(archivedMeals.map((entry) => entry.id)).toEqual([meal.id]);
  });

  it("search finds meals by name", () => {
    mealsRepo.create(context.db, {
      name: "Taco Tuesday",
      ingredients: [{ name: "Ground beef", quantityText: "1 lb" }],
      tags: ["favorite"],
    });
    mealsRepo.create(context.db, {
      name: "Chicken Soup",
      ingredients: [{ name: "Broth", quantityText: "4 cups" }],
      tags: ["cozy"],
    });

    const results = mealsRepo.search(context.db, "taco");

    expect(results.map((meal) => meal.name)).toEqual(["Taco Tuesday"]);
  });
});
