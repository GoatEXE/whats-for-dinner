import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayIsoDate } from "@/db/repo-helpers";
import * as historyRepo from "@/db/repos/history-repo";
import * as mealsRepo from "@/db/repos/meals-repo";
import * as weeklyPlansRepo from "@/db/repos/weekly-plans-repo";

import { createTestDb, type TestDatabaseContext } from "../helpers/test-db";

function createMeal(context: TestDatabaseContext, name: string) {
  return mealsRepo.create(context.db, {
    name,
    ingredients: [
      { name: `${name} Ingredient 1`, quantityText: "1" },
      { name: `${name} Ingredient 2`, quantityText: "2", isOptional: true },
    ],
    tags: ["family"],
  });
}

describe("weekly-plans repo", () => {
  let context: TestDatabaseContext;

  beforeEach(() => {
    context = createTestDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    context.close();
  });

  it("create inserts a plan with seven empty slots", () => {
    const plan = weeklyPlansRepo.create(context.db, "2026-04-06");

    expect(plan.weekStart).toBe("2026-04-06");
    expect(plan.isArchived).toBe(false);
    expect(plan.slots).toHaveLength(7);
    expect(plan.slots.map((slot) => slot.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(plan.slots.every((slot) => (
      slot.mealId === null
      && slot.mealName === null
      && slot.customName === null
      && slot.notes === null
      && slot.servedAt === null
    ))).toBe(true);
  });

  it("getOrCreateCurrent creates the current plan once and then returns the existing plan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    const created = weeklyPlansRepo.getOrCreateCurrent(context.db);
    const existing = weeklyPlansRepo.getOrCreateCurrent(context.db);

    expect(created.weekStart).toBe("2026-04-06");
    expect(created.slots).toHaveLength(7);
    expect(existing.id).toBe(created.id);
  });

  it("assignSlot stores the selected meal on the requested slot", () => {
    const meal = createMeal(context, "Taco Tuesday");
    const plan = weeklyPlansRepo.create(context.db, "2026-04-06");

    const slot = weeklyPlansRepo.assignSlot(context.db, plan.id, 1, meal.id, "Use the salsa first");
    const refreshedPlan = weeklyPlansRepo.getById(context.db, plan.id);

    expect(slot).toMatchObject({
      planId: plan.id,
      day: 1,
      mealId: meal.id,
      mealName: "Taco Tuesday",
      notes: "Use the salsa first",
      servedAt: null,
    });
    expect(refreshedPlan?.slots[1]).toEqual(slot);
  });

  it("clearSlot clears the assigned meal, notes, and served timestamp", () => {
    const meal = createMeal(context, "Soup Night");
    const plan = weeklyPlansRepo.create(context.db, "2026-04-06");

    weeklyPlansRepo.assignSlot(context.db, plan.id, 3, meal.id, "Serve with bread");
    weeklyPlansRepo.serveSlot(context.db, plan.id, 3);

    weeklyPlansRepo.clearSlot(context.db, plan.id, 3);

    const clearedSlot = weeklyPlansRepo.getById(context.db, plan.id)?.slots[3];

    expect(clearedSlot).toMatchObject({
      day: 3,
      mealId: null,
      mealName: null,
      notes: null,
      servedAt: null,
    });
  });

  it("serveSlot marks the slot as served and records history", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T18:15:00.000Z"));

    const meal = createMeal(context, "Pizza Night");
    const plan = weeklyPlansRepo.create(context.db, "2026-04-06");

    weeklyPlansRepo.assignSlot(context.db, plan.id, 4, meal.id, "Extra cheese");

    const servedSlot = weeklyPlansRepo.serveSlot(context.db, plan.id, 4);
    const refreshedPlan = weeklyPlansRepo.getById(context.db, plan.id);
    const history = historyRepo.getByMeal(context.db, meal.id);

    expect(servedSlot).toMatchObject({
      day: 4,
      mealId: meal.id,
      mealName: "Pizza Night",
      notes: "Extra cheese",
      servedAt: "2026-04-08T18:15:00.000Z",
    });
    expect(refreshedPlan?.slots[4]?.servedAt).toBe("2026-04-08T18:15:00.000Z");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      mealId: meal.id,
      mealName: "Pizza Night",
      servedOn: todayIsoDate(),
    });
  });

  it("archive marks a plan as archived and listArchived returns archived plans", () => {
    const firstPlan = weeklyPlansRepo.create(context.db, "2026-04-06");
    const secondPlan = weeklyPlansRepo.create(context.db, "2026-04-13");

    const archivedFirstPlan = weeklyPlansRepo.archive(context.db, firstPlan.id);
    const archivedSecondPlan = weeklyPlansRepo.archive(context.db, secondPlan.id);
    const archivedPlans = weeklyPlansRepo.listArchived(context.db, 10);

    expect(archivedFirstPlan?.isArchived).toBe(true);
    expect(archivedSecondPlan?.isArchived).toBe(true);
    expect(archivedPlans).toHaveLength(2);
    expect(archivedPlans.map((plan) => plan.id)).toEqual([secondPlan.id, firstPlan.id]);
    expect(archivedPlans.every((plan) => plan.isArchived)).toBe(true);
  });

  it("getPlannedMealIds returns distinct meal ids from the plan slots", () => {
    const firstMeal = createMeal(context, "Burgers");
    const secondMeal = createMeal(context, "Pasta");
    const plan = weeklyPlansRepo.create(context.db, "2026-04-06");

    weeklyPlansRepo.assignSlot(context.db, plan.id, 0, firstMeal.id);
    weeklyPlansRepo.assignSlot(context.db, plan.id, 2, secondMeal.id);
    weeklyPlansRepo.assignSlot(context.db, plan.id, 5, firstMeal.id);

    const plannedMealIds = weeklyPlansRepo.getPlannedMealIds(context.db, plan.id);

    expect(new Set(plannedMealIds)).toEqual(new Set([firstMeal.id, secondMeal.id]));
    expect(plannedMealIds).toHaveLength(2);
  });
});
