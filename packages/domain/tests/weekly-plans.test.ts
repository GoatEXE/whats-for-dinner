import { HttpError } from "../src/errors";
import type { SuggestionMeal } from "../src/suggestions";
import {
  applySlotUpdate,
  autofillEmptySlots,
  fillSlotRandom,
  getCurrentSlot,
  getRandomSlotExcludeMealIds,
  listPlannedMealIds,
  resolveUpdatedSlotValues,
  type WeeklyPlan,
  type WeeklyPlanMeal,
  type WeeklyPlanSlot,
} from "../src/weekly-plans";

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function createWeeklyMeal(
  id: number,
  name = `Meal ${id}`,
  overrides: Partial<WeeklyPlanMeal> = {},
): WeeklyPlanMeal {
  return {
    id,
    name,
    isFavorite: false,
    isArchived: false,
    ...overrides,
  };
}

function createSuggestionMeal(
  id: number,
  name = `Meal ${id}`,
  overrides: Partial<SuggestionMeal> = {},
): SuggestionMeal {
  return {
    id,
    name,
    notes: null,
    prepMinutes: null,
    isFavorite: false,
    tags: [],
    ingredients: [],
    ...overrides,
  };
}

function createSlot(
  day: number,
  overrides: Partial<WeeklyPlanSlot> = {},
): WeeklyPlanSlot {
  return {
    day,
    date: `2026-04-${String(6 + day).padStart(2, "0")}`,
    label: DAY_LABELS[day] ?? `Day ${day}`,
    meal: null,
    notes: null,
    served: false,
    ...overrides,
  };
}

function createPlan(overrides: Partial<WeeklyPlan> = {}): WeeklyPlan {
  const slots = Array.from({ length: 7 }, (_, day) => createSlot(day));

  return {
    id: 1,
    weekStart: "2026-04-06",
    isArchived: false,
    slots,
    ...overrides,
  };
}

describe("weekly-plans domain helpers", () => {
  describe("getCurrentSlot", () => {
    it("returns the matching slot and throws a 404 when it is missing", () => {
      const plan = createPlan();

      expect(getCurrentSlot(plan, 2)).toEqual(plan.slots[2]);
      expect(() => getCurrentSlot({ ...plan, slots: plan.slots.slice(0, 3) }, 6)).toThrow(
        HttpError,
      );
      expect(() => getCurrentSlot({ ...plan, slots: plan.slots.slice(0, 3) }, 6)).toThrow(
        "Weekly plan slot not found",
      );
    });
  });

  describe("listPlannedMealIds", () => {
    it("deduplicates planned meal ids while preserving first-seen order", () => {
      const sharedMeal = createWeeklyMeal(10, "Repeat Meal");
      const uniqueMeal = createWeeklyMeal(20, "Unique Meal");
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: sharedMeal }),
          createSlot(1),
          createSlot(2, { meal: uniqueMeal }),
          createSlot(3, { meal: sharedMeal }),
          createSlot(4),
          createSlot(5, { meal: createWeeklyMeal(30, "Third Meal") }),
          createSlot(6),
        ],
      });

      expect(listPlannedMealIds(plan)).toEqual([10, 20, 30]);
    });
  });

  describe("resolveUpdatedSlotValues", () => {
    it("preserves notes by default, clears them when a slot is emptied, and validates meals", () => {
      const currentSlot = createSlot(1, {
        meal: createWeeklyMeal(1, "Current Meal"),
        notes: "Keep this reminder",
      });

      expect(
        resolveUpdatedSlotValues(currentSlot, { mealId: 2 }, { mealExists: (mealId) => mealId === 2 }),
      ).toEqual({
        mealId: 2,
        notes: "Keep this reminder",
      });
      expect(resolveUpdatedSlotValues(currentSlot, { mealId: null })).toEqual({
        mealId: null,
        notes: null,
      });
      expect(
        resolveUpdatedSlotValues(currentSlot, {
          mealId: 2,
          notes: "Use leftovers first",
        }),
      ).toEqual({
        mealId: 2,
        notes: "Use leftovers first",
      });
      expect(() =>
        resolveUpdatedSlotValues(currentSlot, { mealId: 999 }, { mealExists: () => false }),
      ).toThrow("Meal not found");
    });
  });

  describe("applySlotUpdate", () => {
    it("reuses the current meal summary for same-meal updates and clears notes when removing a meal", () => {
      const currentMeal = createWeeklyMeal(1, "Pasta", {
        isFavorite: true,
        isArchived: true,
      });
      const plan = createPlan({
        slots: [
          createSlot(0),
          createSlot(1, {
            meal: currentMeal,
            notes: "Keep the garlic bread",
          }),
          createSlot(2, { meal: createWeeklyMeal(2, "Soup") }),
          createSlot(3),
          createSlot(4),
          createSlot(5),
          createSlot(6),
        ],
      });

      const updatedSameMeal = applySlotUpdate(plan, 1, { mealId: 1 });
      const clearedSlot = applySlotUpdate(plan, 1, { mealId: null });

      expect(updatedSameMeal.slots[1]?.meal).toEqual(currentMeal);
      expect(updatedSameMeal.slots[1]?.notes).toBe("Keep the garlic bread");
      expect(updatedSameMeal.slots[2]).toEqual(plan.slots[2]);
      expect(clearedSlot.slots[1]).toMatchObject({ meal: null, notes: null });
    });

    it("uses resolveMeal for new meal summaries and throws for missing days", () => {
      const plan = createPlan();

      const updatedPlan = applySlotUpdate(plan, 4, { mealId: 9 }, {
        resolveMeal: (mealId) => createWeeklyMeal(mealId, "Resolved Meal", { isFavorite: true }),
      });

      expect(updatedPlan.slots[4]).toMatchObject({
        meal: {
          id: 9,
          name: "Resolved Meal",
          isFavorite: true,
          isArchived: false,
        },
      });
      expect(() => applySlotUpdate({ ...plan, slots: plan.slots.slice(0, 2) }, 6, { mealId: 1 })).toThrow(
        "Weekly plan slot not found",
      );
    });
  });

  describe("getRandomSlotExcludeMealIds", () => {
    it("returns undefined when planned meals should not be excluded", () => {
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: createWeeklyMeal(1) }),
          createSlot(1),
          createSlot(2),
          createSlot(3),
          createSlot(4),
          createSlot(5),
          createSlot(6),
        ],
      });

      expect(getRandomSlotExcludeMealIds(plan, 1, { excludePlannedMeals: false })).toBeUndefined();
    });

    it("omits the current meal from exclusions when it is only planned once", () => {
      const currentMeal = createWeeklyMeal(2, "Tuesday Meal");
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: createWeeklyMeal(1, "Monday Meal") }),
          createSlot(1, { meal: currentMeal }),
          createSlot(2),
          createSlot(3, { meal: createWeeklyMeal(3, "Thursday Meal") }),
          createSlot(4),
          createSlot(5),
          createSlot(6),
        ],
      });

      expect(getRandomSlotExcludeMealIds(plan, 1, { excludePlannedMeals: true })).toEqual([1, 3]);
    });

    it("keeps the current meal excluded when it is already planned elsewhere", () => {
      const duplicateMeal = createWeeklyMeal(2, "Repeat Meal");
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: createWeeklyMeal(1, "Monday Meal") }),
          createSlot(1, { meal: duplicateMeal }),
          createSlot(2),
          createSlot(3, { meal: duplicateMeal }),
          createSlot(4),
          createSlot(5),
          createSlot(6),
        ],
      });

      expect(getRandomSlotExcludeMealIds(plan, 1, { excludePlannedMeals: true })).toEqual([1, 2]);
    });
  });

  describe("fillSlotRandom", () => {
    it("passes the computed filters through and preserves slot notes", () => {
      const pickedMeal = createSuggestionMeal(9, "Random Winner", { isFavorite: true });
      const pickRandomMeal = vi.fn(() => ({
        meal: pickedMeal,
        candidateCount: 4,
        filtersApplied: {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
          excludeMealIds: [1, 3],
        },
      }));
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: createWeeklyMeal(1, "Monday Meal") }),
          createSlot(1, {
            meal: createWeeklyMeal(2, "Tuesday Meal"),
            notes: "Keep this note",
          }),
          createSlot(2),
          createSlot(3, { meal: createWeeklyMeal(3, "Thursday Meal") }),
          createSlot(4),
          createSlot(5),
          createSlot(6),
        ],
      });

      const result = fillSlotRandom({
        plan,
        day: 1,
        filters: {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
          excludePlannedMeals: true,
        },
        pickRandomMeal,
      });

      expect(pickRandomMeal).toHaveBeenCalledWith({
        favoritesOnly: true,
        fullMatchOnly: false,
        excludeServedWithinDays: 14,
        excludeMealIds: [1, 3],
      });
      expect(result.randomResult.meal).toEqual(pickedMeal);
      expect(result.plan.slots[1]).toMatchObject({
        meal: pickedMeal,
        notes: "Keep this note",
      });
      expect(result.plan.slots[0]).toEqual(plan.slots[0]);
    });
  });

  describe("autofillEmptySlots", () => {
    it("returns a no-op result when there are no empty slots", () => {
      const pickRandomMeal = vi.fn();
      const plan = createPlan({
        slots: Array.from({ length: 7 }, (_, day) =>
          createSlot(day, { meal: createWeeklyMeal(day + 1) }),
        ),
      });

      const result = autofillEmptySlots({
        plan,
        filters: {
          favoritesOnly: false,
          fullMatchOnly: false,
          excludeServedWithinDays: 0,
        },
        pickRandomMeal,
      });

      expect(result.plan).toEqual(plan);
      expect(result.autofillResult).toEqual({
        filledCount: 0,
        skippedCount: 0,
        emptyBeforeCount: 0,
        noMoreCandidates: false,
      });
      expect(pickRandomMeal).not.toHaveBeenCalled();
    });

    it("fills empty slots in day order, preserves notes, and cumulatively excludes picked meals", () => {
      const meals = [
        createSuggestionMeal(1, "Meal 1"),
        createSuggestionMeal(2, "Meal 2", { isFavorite: true }),
        createSuggestionMeal(3, "Meal 3", { isFavorite: true }),
        createSuggestionMeal(4, "Meal 4"),
        createSuggestionMeal(5, "Meal 5"),
        createSuggestionMeal(6, "Meal 6"),
      ];
      const pickRandomMealCalls: Array<{
        favoritesOnly: boolean;
        fullMatchOnly: boolean;
        excludeServedWithinDays: number;
        excludeMealIds?: number[];
      }> = [];
      const plan = createPlan({
        slots: [
          createSlot(0, { meal: createWeeklyMeal(1, "Meal 1") }),
          createSlot(1, { notes: "Keep this reminder" }),
          createSlot(2),
          createSlot(3, { meal: createWeeklyMeal(4, "Meal 4") }),
          createSlot(4, { meal: createWeeklyMeal(5, "Meal 5") }),
          createSlot(5, { meal: createWeeklyMeal(6, "Meal 6") }),
          createSlot(6),
        ],
      });
      const pickRandomMeal = vi.fn((filters) => {
        pickRandomMealCalls.push(filters);

        if (pickRandomMealCalls.length === 1) {
          return { meal: meals[1]! };
        }

        if (pickRandomMealCalls.length === 2) {
          return { meal: meals[2]! };
        }

        return { meal: createSuggestionMeal(7, "Meal 7") };
      });

      const result = autofillEmptySlots({
        plan,
        filters: {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
        },
        pickRandomMeal,
      });

      expect(result.autofillResult).toEqual({
        filledCount: 3,
        skippedCount: 0,
        emptyBeforeCount: 3,
        noMoreCandidates: false,
      });
      expect(result.plan.slots[1]).toMatchObject({
        meal: meals[1],
        notes: "Keep this reminder",
      });
      expect(result.plan.slots[2]).toMatchObject({ meal: meals[2], notes: null });
      expect(result.plan.slots[6]).toMatchObject({ meal: { id: 7, name: "Meal 7" } });
      expect(pickRandomMealCalls).toEqual([
        {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
          excludeMealIds: [1, 4, 5, 6],
        },
        {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
          excludeMealIds: [1, 4, 5, 6, 2],
        },
        {
          favoritesOnly: true,
          fullMatchOnly: false,
          excludeServedWithinDays: 14,
          excludeMealIds: [1, 4, 5, 6, 2, 3],
        },
      ]);
    });

    it("returns a partial success result when no more candidates remain", () => {
      const meal = createSuggestionMeal(1, "Only Meal");
      let pickCount = 0;
      const plan = createPlan();

      const result = autofillEmptySlots({
        plan,
        filters: {
          favoritesOnly: false,
          fullMatchOnly: false,
          excludeServedWithinDays: 0,
        },
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

      expect(result.autofillResult).toEqual({
        filledCount: 1,
        skippedCount: 6,
        emptyBeforeCount: 7,
        noMoreCandidates: true,
      });
      expect(result.plan.slots[0]?.meal).toEqual(meal);
      expect(result.plan.slots.slice(1).every((slot) => slot.meal === null)).toBe(true);
      expect(pickCount).toBe(2);
    });
  });
});
