import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedSampleData } from "@/db/seed";
import { resetAndReseed } from "@/db/reset";
import { isDatabaseEmpty } from "@/db/is-empty";
import * as mealsRepo from "@/db/repos/meals-repo";
import * as pantryRepo from "@/db/repos/pantry-repo";
import * as historyRepo from "@/db/repos/history-repo";
import * as weeklyPlansRepo from "@/db/repos/weekly-plans-repo";

import { createTestDb, type TestDatabaseContext } from "./helpers/test-db";

describe("sample data seed", () => {
  let ctx: TestDatabaseContext;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.close();
  });

  it("reports an empty DB before seeding", () => {
    expect(isDatabaseEmpty(ctx.db)).toBe(true);
  });

  it("creates meals, pantry, plan slots, and history on seed", () => {
    const summary = seedSampleData(ctx.db);

    expect(summary.meals).toBeGreaterThanOrEqual(12);
    expect(summary.pantry).toBeGreaterThanOrEqual(10);
    expect(summary.planSlots).toBeGreaterThanOrEqual(4);
    expect(summary.history).toBeGreaterThanOrEqual(5);

    // Sanity check: meals actually in DB with ingredients + tags.
    const meals = mealsRepo.getAll(ctx.db);
    expect(meals.length).toBeGreaterThanOrEqual(12);

    const firstMeal = meals[0]!;
    expect(firstMeal.ingredients.length).toBeGreaterThan(0);

    const tagMeals = meals.filter((m) => m.tags.length > 0);
    expect(tagMeals.length).toBeGreaterThan(0);

    const favorites = meals.filter((m) => m.isFavorite);
    expect(favorites.length).toBeGreaterThan(0);

    // Pantry items are present.
    const pantryItems = pantryRepo.getAll(ctx.db);
    expect(pantryItems.length).toBeGreaterThanOrEqual(10);

    // Active plan with assigned slots.
    const plan = weeklyPlansRepo.getCurrent(ctx.db);
    expect(plan).not.toBeNull();
    const filledSlots = plan!.slots.filter((s) => s.mealId !== null);
    expect(filledSlots.length).toBeGreaterThanOrEqual(4);

    // History entries exist.
    const history = historyRepo.getAll(ctx.db);
    expect(history.length).toBeGreaterThanOrEqual(5);
  });

  it("is idempotent: seeding twice does not create duplicate meals", () => {
    seedSampleData(ctx.db);
    const firstCount = mealsRepo.getAll(ctx.db).length;

    // Second call should be a no-op via normalized-name dedupe.
    seedSampleData(ctx.db);
    const secondCount = mealsRepo.getAll(ctx.db).length;

    expect(secondCount).toBe(firstCount);
  });

  it("reports not-empty after seeding", () => {
    expect(isDatabaseEmpty(ctx.db)).toBe(true);
    seedSampleData(ctx.db);
    expect(isDatabaseEmpty(ctx.db)).toBe(false);
  });

  it("resetAndReseed wipes data and repopulates to expected counts", () => {
    seedSampleData(ctx.db);
    const initialMeals = mealsRepo.getAll(ctx.db).length;
    expect(initialMeals).toBeGreaterThanOrEqual(12);

    resetAndReseed(ctx.db);
    const afterReset = mealsRepo.getAll(ctx.db).length;
    expect(afterReset).toBe(initialMeals);

    const pantry = pantryRepo.getAll(ctx.db);
    expect(pantry.length).toBeGreaterThanOrEqual(10);
  });
});
