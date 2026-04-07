const { createTestContext } = require("../helpers/test-app");
const { createCatalogRepo } = require("../../src/modules/catalog/catalog.repo");
const { createMealsRepo } = require("../../src/modules/meals/meals.repo");
const { createHistoryRepo } = require("../../src/modules/history/history.repo");
const {
  createHistoryService,
} = require("../../src/modules/history/history.service");
const {
  createWeeklyPlansRepo,
} = require("../../src/modules/weekly-plans/weekly-plans.repo");
const {
  createWeeklyPlansService,
} = require("../../src/modules/weekly-plans/weekly-plans.service");
const { HttpError } = require("../../src/lib/errors");

const contexts = [];

function createMeal(mealsRepo, overrides = {}) {
  return mealsRepo.createMeal({
    name: "Test Meal",
    notes: null,
    prepMinutes: 20,
    isFavorite: false,
    isArchived: false,
    tags: [],
    ingredients: [{ name: "Ingredient" }],
    ...overrides,
  });
}

function setup(suggestionsServiceOverride) {
  const context = createTestContext();
  contexts.push(context);

  const catalogRepo = createCatalogRepo(context.db);
  const mealsRepo = createMealsRepo(context.db, catalogRepo);
  const historyRepo = createHistoryRepo(context.db);
  const historyService = createHistoryService(historyRepo, mealsRepo);
  const weeklyPlansRepo = createWeeklyPlansRepo(context.db);
  const weeklyPlansService = createWeeklyPlansService(
    weeklyPlansRepo,
    mealsRepo,
    historyService,
    suggestionsServiceOverride ?? {
      pickRandomMeal() {
        throw new Error("pickRandomMeal should not be called in this test");
      },
    },
  );

  return {
    ...context,
    mealsRepo,
    historyRepo,
    historyService,
    weeklyPlansRepo,
    weeklyPlansService,
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

describe("weekly plans service plan reuse", () => {
  it("creates a new active week from a source plan, archives the displaced active plan, and does not copy served state", () => {
    const { mealsRepo, historyService, weeklyPlansRepo, weeklyPlansService } =
      setup();

    const recurringMeal = mealsRepo.createMeal({
      name: "Recurring Pasta",
      notes: null,
      prepMinutes: 25,
      isFavorite: true,
      isArchived: false,
      tags: [],
      ingredients: [{ name: "Pasta" }, { name: "Sauce" }],
    });
    const archivedMeal = mealsRepo.createMeal({
      name: "Old Taco Night",
      notes: null,
      prepMinutes: 20,
      isFavorite: false,
      isArchived: false,
      tags: [],
      ingredients: [{ name: "Tortillas" }],
    });

    const sourcePlan = weeklyPlansService.createPlan("2026-04-06");
    weeklyPlansRepo.updateSlot(sourcePlan.id, 0, recurringMeal.id, "Pasta Monday");
    weeklyPlansRepo.updateSlot(sourcePlan.id, 2, archivedMeal.id, "Use frozen beef");
    historyService.addHistory({
      mealId: recurringMeal.id,
      servedOn: "2026-04-06",
      source: "plan",
    });
    mealsRepo.archiveMeal(archivedMeal.id);

    const activePlan = weeklyPlansService.createPlan("2026-04-13");
    const reusedPlan = weeklyPlansService.createPlanFromSource(
      sourcePlan.id,
      "2026-04-20",
    );

    expect(reusedPlan.weekStart).toBe("2026-04-20");
    expect(reusedPlan.isArchived).toBe(false);
    expect(reusedPlan.slots[0]).toEqual({
      day: 0,
      date: "2026-04-20",
      label: "Monday",
      meal: {
        id: recurringMeal.id,
        name: "Recurring Pasta",
        isFavorite: true,
        isArchived: false,
      },
      notes: "Pasta Monday",
      served: false,
    });
    expect(reusedPlan.slots[2]).toEqual({
      day: 2,
      date: "2026-04-22",
      label: "Wednesday",
      meal: {
        id: archivedMeal.id,
        name: "Old Taco Night",
        isFavorite: false,
        isArchived: true,
      },
      notes: "Use frozen beef",
      served: false,
    });
    expect(reusedPlan.slots[6]).toEqual({
      day: 6,
      date: "2026-04-26",
      label: "Sunday",
      meal: null,
      notes: null,
      served: false,
    });
    expect(weeklyPlansRepo.getActivePlan().id).toBe(reusedPlan.id);
    expect(weeklyPlansRepo.getPlanById(sourcePlan.id).isArchived).toBe(true);
    expect(weeklyPlansRepo.getPlanById(activePlan.id).isArchived).toBe(true);
    expect(weeklyPlansRepo.listArchivedPlans(10).map((plan) => plan.id)).toEqual([
      activePlan.id,
      sourcePlan.id,
    ]);
    expect(
      weeklyPlansService
        .getPlanById(reusedPlan.id)
        .slots.filter((slot) => slot.served)
        .map((slot) => slot.day),
    ).toEqual([]);
  });

  it("throws 404 when the source plan does not exist", () => {
    const { weeklyPlansService } = setup();

    expect(() => weeklyPlansService.createPlanFromSource(9999, "2026-04-20")).toThrow(
      "Weekly plan not found",
    );
  });

  it("throws 409 when the target week already has the active plan", () => {
    const { weeklyPlansService } = setup();

    const sourcePlan = weeklyPlansService.createPlan("2026-04-06");
    weeklyPlansService.createPlan("2026-04-13");

    expect(() =>
      weeklyPlansService.createPlanFromSource(sourcePlan.id, "2026-04-13"),
    ).toThrow("A weekly plan for that week already exists");
  });
});

describe("weekly plans service autofill", () => {
  it("fills empty slots in day order, preserves notes, and grows the exclude set", () => {
    const pickRandomMealCalls = [];
    const { mealsRepo, weeklyPlansRepo, weeklyPlansService } = setup({
      pickRandomMeal(filters) {
        pickRandomMealCalls.push(filters);

        if (pickRandomMealCalls.length === 1) {
          return { meal: meals[1] };
        }

        return { meal: meals[2] };
      },
    });
    const meals = [
      createMeal(mealsRepo, { name: "Meal 0" }),
      createMeal(mealsRepo, { name: "Meal 1" }),
      createMeal(mealsRepo, { name: "Meal 2" }),
      createMeal(mealsRepo, { name: "Meal 3" }),
      createMeal(mealsRepo, { name: "Meal 4" }),
      createMeal(mealsRepo, { name: "Meal 5" }),
      createMeal(mealsRepo, { name: "Meal 6" }),
    ];

    const plan = weeklyPlansService.createPlan("2026-04-06");
    weeklyPlansRepo.updateSlot(plan.id, 0, meals[0].id, null);
    weeklyPlansRepo.updateSlot(plan.id, 1, null, "Keep this reminder");
    weeklyPlansRepo.updateSlot(plan.id, 3, meals[3].id, null);
    weeklyPlansRepo.updateSlot(plan.id, 4, meals[4].id, null);
    weeklyPlansRepo.updateSlot(plan.id, 5, meals[5].id, null);
    weeklyPlansRepo.updateSlot(plan.id, 6, meals[6].id, null);

    const result = weeklyPlansService.autofillEmptySlots({
      favoritesOnly: true,
      fullMatchOnly: false,
      excludeServedWithinDays: 14,
    });

    expect(result.autofillResult).toEqual({
      filledCount: 2,
      skippedCount: 0,
      emptyBeforeCount: 2,
      noMoreCandidates: false,
    });
    expect(result.plan.slots[1].meal.id).toBe(meals[1].id);
    expect(result.plan.slots[1].notes).toBe("Keep this reminder");
    expect(result.plan.slots[2].meal.id).toBe(meals[2].id);
    expect(pickRandomMealCalls).toEqual([
      {
        favoritesOnly: true,
        fullMatchOnly: false,
        excludeServedWithinDays: 14,
        excludeMealIds: [
          meals[0].id,
          meals[3].id,
          meals[4].id,
          meals[5].id,
          meals[6].id,
        ],
      },
      {
        favoritesOnly: true,
        fullMatchOnly: false,
        excludeServedWithinDays: 14,
        excludeMealIds: [
          meals[0].id,
          meals[3].id,
          meals[4].id,
          meals[5].id,
          meals[6].id,
          meals[1].id,
        ],
      },
    ]);
  });

  it("returns a partial success result when candidates run out", () => {
    let pickCount = 0;
    const { mealsRepo, weeklyPlansService } = setup({
      pickRandomMeal(filters) {
        pickCount += 1;

        if (pickCount === 1) {
          expect(filters.excludeMealIds).toEqual([]);
          return { meal };
        }

        expect(filters.excludeMealIds).toEqual([meal.id]);
        throw new HttpError(404, "No meals matched the random selection filters");
      },
    });
    const meal = createMeal(mealsRepo, { name: "Only Meal" });

    weeklyPlansService.createPlan("2026-04-06");

    const result = weeklyPlansService.autofillEmptySlots({
      favoritesOnly: false,
      fullMatchOnly: false,
      excludeServedWithinDays: 0,
    });

    expect(result.autofillResult).toEqual({
      filledCount: 1,
      skippedCount: 6,
      emptyBeforeCount: 7,
      noMoreCandidates: true,
    });
    expect(result.plan.slots[0].meal.id).toBe(meal.id);
    expect(result.plan.slots.slice(1).every((slot) => slot.meal === null)).toBe(true);
    expect(pickCount).toBe(2);
  });
});
