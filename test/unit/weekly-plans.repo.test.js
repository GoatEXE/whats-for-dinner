const { createTestContext } = require("../helpers/test-app");
const { createCatalogRepo } = require("../../src/modules/catalog/catalog.repo");
const { createMealsRepo } = require("../../src/modules/meals/meals.repo");
const { createHistoryRepo } = require("../../src/modules/history/history.repo");
const {
  createWeeklyPlansRepo,
} = require("../../src/modules/weekly-plans/weekly-plans.repo");

const contexts = [];

function setup() {
  const context = createTestContext();
  contexts.push(context);

  const catalogRepo = createCatalogRepo(context.db);
  const mealsRepo = createMealsRepo(context.db, catalogRepo);
  const historyRepo = createHistoryRepo(context.db);
  const weeklyPlansRepo = createWeeklyPlansRepo(context.db);

  return {
    ...context,
    catalogRepo,
    mealsRepo,
    historyRepo,
    weeklyPlansRepo,
  };
}

afterEach(() => {
  while (contexts.length > 0) {
    const context = contexts.pop();

    if (context) {
      context.cleanup();
    }
  }
});

describe("weekly plans repository", () => {
  it("applies the weekly-plans migrations", () => {
    const { db } = setup();

    const baseMigration = db
      .prepare(
        "SELECT filename FROM schema_migrations WHERE filename = '002_weekly_plans.sql'",
      )
      .get();
    const hardeningMigration = db
      .prepare(
        "SELECT filename FROM schema_migrations WHERE filename = '003_weekly_plans_hardening.sql'",
      )
      .get();
    const weeklyPlansTable = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'weekly_plans'",
      )
      .get();
    const weeklyPlanSlotsTable = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'weekly_plan_slots'",
      )
      .get();

    expect(baseMigration).toBeTruthy();
    expect(hardeningMigration).toBeTruthy();
    expect(weeklyPlansTable).toBeTruthy();
    expect(weeklyPlanSlotsTable).toBeTruthy();
  });

  it("creates a plan with seven empty slots and can archive/list plans", () => {
    const { weeklyPlansRepo } = setup();

    const firstPlan = weeklyPlansRepo.createPlan("2026-04-06");

    expect(firstPlan.weekStart).toBe("2026-04-06");
    expect(firstPlan.isArchived).toBe(false);
    expect(firstPlan.createdAt).toMatch(/\.\d{3}$/);
    expect(firstPlan.updatedAt).toMatch(/\.\d{3}$/);
    expect(firstPlan.slots).toHaveLength(7);
    expect(firstPlan.slots[0]).toEqual({
      day: 0,
      date: "2026-04-06",
      label: "Monday",
      meal: null,
      notes: null,
      served: false,
    });
    expect(firstPlan.slots[6]).toEqual({
      day: 6,
      date: "2026-04-12",
      label: "Sunday",
      meal: null,
      notes: null,
      served: false,
    });

    expect(weeklyPlansRepo.getActivePlan().id).toBe(firstPlan.id);

    expect(weeklyPlansRepo.archiveActivePlan()).toBe(1);
    expect(weeklyPlansRepo.getActivePlan()).toBeNull();

    const secondPlan = weeklyPlansRepo.createPlan("2026-04-13");
    const archivedPlans = weeklyPlansRepo.listArchivedPlans(10);

    expect(secondPlan.weekStart).toBe("2026-04-13");
    expect(archivedPlans).toEqual([
      {
        id: firstPlan.id,
        weekStart: "2026-04-06",
        createdAt: expect.any(String),
      },
    ]);
  });

  it("enforces a single active plan and can atomically replace it", () => {
    const { weeklyPlansRepo } = setup();

    const firstPlan = weeklyPlansRepo.createPlan("2026-04-06");

    expect(() => weeklyPlansRepo.createPlan("2026-04-13")).toThrow(
      /UNIQUE constraint failed: weekly_plans\.is_archived/,
    );
    expect(weeklyPlansRepo.getActivePlan().id).toBe(firstPlan.id);

    const replacementPlan = weeklyPlansRepo.replaceActivePlan("2026-04-13");

    expect(replacementPlan.weekStart).toBe("2026-04-13");
    expect(replacementPlan.isArchived).toBe(false);
    expect(replacementPlan.slots).toHaveLength(7);
    expect(weeklyPlansRepo.getActivePlan().id).toBe(replacementPlan.id);
    expect(weeklyPlansRepo.listArchivedPlans(10)).toEqual([
      {
        id: firstPlan.id,
        weekStart: "2026-04-06",
        createdAt: expect.any(String),
      },
    ]);
  });

  it("updates slots, advances updatedAt without sleeps, derives served status, and lists planned meal ids", () => {
    const { mealsRepo, historyRepo, weeklyPlansRepo } = setup();

    const meal = mealsRepo.createMeal({
      name: "Taco Tuesday",
      notes: null,
      prepMinutes: 20,
      isFavorite: true,
      isArchived: false,
      tags: ["quick"],
      ingredients: [{ name: "Tortillas" }, { name: "Ground beef" }],
    });
    const plan = weeklyPlansRepo.createPlan("2026-04-06");

    const updatedPlan = weeklyPlansRepo.updateSlot(
      plan.id,
      1,
      meal.id,
      "Use leftover salsa",
    );
    const updatedPlanAgain = weeklyPlansRepo.updateSlot(
      plan.id,
      2,
      meal.id,
      "Use the rest on Wednesday",
    );

    expect(updatedPlan.updatedAt).toMatch(/\.\d{3}$/);
    expect(updatedPlan.updatedAt > plan.updatedAt).toBe(true);
    expect(updatedPlanAgain.updatedAt > updatedPlan.updatedAt).toBe(true);

    expect(updatedPlan.slots[1]).toEqual({
      day: 1,
      date: "2026-04-07",
      label: "Tuesday",
      meal: {
        id: meal.id,
        name: "Taco Tuesday",
        isFavorite: true,
        isArchived: false,
      },
      notes: "Use leftover salsa",
      served: false,
    });
    expect(updatedPlanAgain.slots[2]).toEqual({
      day: 2,
      date: "2026-04-08",
      label: "Wednesday",
      meal: {
        id: meal.id,
        name: "Taco Tuesday",
        isFavorite: true,
        isArchived: false,
      },
      notes: "Use the rest on Wednesday",
      served: false,
    });
    expect(weeklyPlansRepo.listPlannedMealIds(plan.id)).toEqual([meal.id]);

    historyRepo.addHistory({
      mealId: meal.id,
      servedOn: "2026-04-07",
      source: "plan",
    });

    expect(weeklyPlansRepo.getSlot(plan.id, 1)).toEqual({
      day: 1,
      date: "2026-04-07",
      label: "Tuesday",
      meal: {
        id: meal.id,
        name: "Taco Tuesday",
        isFavorite: true,
        isArchived: false,
      },
      notes: "Use leftover salsa",
      served: true,
    });
    expect(weeklyPlansRepo.getActivePlan().slots[1].served).toBe(true);
  });

  it("copies source slot assignments into a new week and can atomically replace the active plan from source", () => {
    const { mealsRepo, historyRepo, weeklyPlansRepo } = setup();

    const sourceMeal = mealsRepo.createMeal({
      name: "Reuse Source Meal",
      notes: null,
      prepMinutes: 15,
      isFavorite: true,
      isArchived: false,
      tags: [],
      ingredients: [{ name: "Noodles" }],
    });
    const sourcePlan = weeklyPlansRepo.createPlan("2026-04-06");

    weeklyPlansRepo.updateSlot(sourcePlan.id, 0, sourceMeal.id, "Carry over note");
    historyRepo.addHistory({
      mealId: sourceMeal.id,
      servedOn: "2026-04-06",
      source: "plan",
    });

    const sourceSlots = weeklyPlansRepo.listSlotAssignments(sourcePlan.id);
    weeklyPlansRepo.archiveActivePlan();

    const copiedPlanId = weeklyPlansRepo.createPlanFromSource(
      "2026-04-13",
      sourceSlots,
    );
    const copiedPlan = weeklyPlansRepo.getPlanById(copiedPlanId);

    expect(sourceSlots[0]).toEqual({
      day: 0,
      mealId: sourceMeal.id,
      notes: "Carry over note",
    });
    expect(sourceSlots[6]).toEqual({
      day: 6,
      mealId: null,
      notes: null,
    });
    expect(copiedPlan.weekStart).toBe("2026-04-13");
    expect(copiedPlan.slots[0]).toEqual({
      day: 0,
      date: "2026-04-13",
      label: "Monday",
      meal: {
        id: sourceMeal.id,
        name: "Reuse Source Meal",
        isFavorite: true,
        isArchived: false,
      },
      notes: "Carry over note",
      served: false,
    });

    weeklyPlansRepo.archiveActivePlan();
    const activePlan = weeklyPlansRepo.createPlan("2026-04-20");
    const replacementPlanId = weeklyPlansRepo.replaceActivePlanFromSource(
      "2026-04-27",
      sourceSlots,
    );
    const replacementPlan = weeklyPlansRepo.getPlanById(replacementPlanId);

    expect(replacementPlan.weekStart).toBe("2026-04-27");
    expect(weeklyPlansRepo.getActivePlan().id).toBe(replacementPlanId);
    expect(weeklyPlansRepo.getPlanById(activePlan.id).isArchived).toBe(true);
  });

  it("keeps archived meal summaries visible in plan slots and planned meal id lists", () => {
    const { mealsRepo, weeklyPlansRepo } = setup();

    const meal = mealsRepo.createMeal({
      name: "Pizza Night",
      notes: null,
      prepMinutes: null,
      isFavorite: false,
      isArchived: false,
      tags: [],
      ingredients: [{ name: "Pizza crust" }, { name: "Cheese" }],
    });
    const plan = weeklyPlansRepo.createPlan("2026-04-06");

    weeklyPlansRepo.updateSlot(plan.id, 4, meal.id, null);
    mealsRepo.archiveMeal(meal.id);

    expect(weeklyPlansRepo.getSlot(plan.id, 4)).toEqual({
      day: 4,
      date: "2026-04-10",
      label: "Friday",
      meal: {
        id: meal.id,
        name: "Pizza Night",
        isFavorite: false,
        isArchived: true,
      },
      notes: null,
      served: false,
    });
    expect(weeklyPlansRepo.getActivePlan().slots[4].meal).toEqual({
      id: meal.id,
      name: "Pizza Night",
      isFavorite: false,
      isArchived: true,
    });
    expect(weeklyPlansRepo.listPlannedMealIds(plan.id)).toEqual([meal.id]);
  });
});
