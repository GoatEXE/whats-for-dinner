import { HttpError } from "./errors";
import type { RandomPickerFilters } from "./random-picker";
import type { SuggestionMeal } from "./suggestions";

export interface WeeklyPlanMeal {
  id: number;
  name?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface WeeklyPlanSlot {
  day: number;
  date: string;
  label: string;
  meal: WeeklyPlanMeal | null;
  notes: string | null;
  served: boolean;
}

export interface WeeklyPlan {
  id: number;
  weekStart: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  slots: WeeklyPlanSlot[];
}

export interface UpdateSlotData {
  mealId: number | null;
  notes?: string | null;
}

export interface RandomSlotFilters extends RandomPickerFilters {
  excludePlannedMeals: boolean;
}

export interface AutofillFilters {
  favoritesOnly: boolean;
  fullMatchOnly: boolean;
  excludeServedWithinDays: number;
}

function hasOwnKey(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function getCurrentSlot(plan: WeeklyPlan, day: number) {
  const slot = plan.slots.find((candidate) => candidate.day === day);

  if (!slot) {
    throw new HttpError(404, "Weekly plan slot not found");
  }

  return slot;
}

export function listPlannedMealIds(plan: WeeklyPlan) {
  const plannedMealIds = plan.slots
    .map((slot) => slot.meal?.id)
    .filter((mealId): mealId is number => mealId != null);

  return [...new Set(plannedMealIds)];
}

export function resolveUpdatedSlotValues(
  currentSlot: WeeklyPlanSlot,
  data: UpdateSlotData,
  options: { mealExists?: (mealId: number) => boolean } = {},
) {
  if (data.mealId !== null && options.mealExists && !options.mealExists(data.mealId)) {
    throw new HttpError(404, "Meal not found");
  }

  let nextNotes: string | null | undefined;

  if (hasOwnKey(data, "notes")) {
    nextNotes = data.notes ?? null;
  } else if (data.mealId === null) {
    nextNotes = null;
  } else {
    nextNotes = currentSlot.notes;
  }

  return {
    mealId: data.mealId,
    notes: nextNotes,
  };
}

export function applySlotUpdate(
  plan: WeeklyPlan,
  day: number,
  data: UpdateSlotData,
  options: {
    mealExists?: (mealId: number) => boolean;
    resolveMeal?: (mealId: number) => WeeklyPlanMeal | null | undefined;
  } = {},
) {
  const currentSlot = getCurrentSlot(plan, day);
  const nextValues = resolveUpdatedSlotValues(currentSlot, data, options);

  const nextMeal =
    nextValues.mealId === null
      ? null
      : options.resolveMeal?.(nextValues.mealId) ??
        (currentSlot.meal?.id === nextValues.mealId
          ? currentSlot.meal
          : { id: nextValues.mealId });

  return {
    ...plan,
    slots: plan.slots.map((slot) =>
      slot.day === day
        ? {
            ...slot,
            meal: nextMeal,
            notes: nextValues.notes ?? null,
          }
        : slot,
    ),
  };
}

export function getRandomSlotExcludeMealIds(
  plan: WeeklyPlan,
  day: number,
  filters: Pick<RandomSlotFilters, "excludePlannedMeals">,
) {
  const currentSlot = getCurrentSlot(plan, day);
  const plannedMealIds = listPlannedMealIds(plan);

  if (!filters.excludePlannedMeals) {
    return undefined;
  }

  let excludeMealIds = plannedMealIds;

  if (currentSlot.meal?.id != null) {
    const sameMealPlannedElsewhere = plan.slots.some(
      (slot) => slot.day !== day && slot.meal?.id === currentSlot.meal?.id,
    );

    if (!sameMealPlannedElsewhere) {
      excludeMealIds = plannedMealIds.filter(
        (mealId) => mealId !== currentSlot.meal?.id,
      );
    }
  }

  return excludeMealIds;
}

export function fillSlotRandom(input: {
  plan: WeeklyPlan;
  day: number;
  filters: RandomSlotFilters;
  pickRandomMeal: (filters: RandomPickerFilters) => {
    meal: SuggestionMeal;
    candidateCount?: number;
    filtersApplied?: RandomPickerFilters;
  };
}) {
  const currentSlot = getCurrentSlot(input.plan, input.day);
  const excludeMealIds = getRandomSlotExcludeMealIds(
    input.plan,
    input.day,
    input.filters,
  );
  const randomResult = input.pickRandomMeal({
    favoritesOnly: input.filters.favoritesOnly,
    fullMatchOnly: input.filters.fullMatchOnly,
    excludeServedWithinDays: input.filters.excludeServedWithinDays,
    excludeMealIds,
  });

  return {
    randomResult,
    plan: {
      ...input.plan,
      slots: input.plan.slots.map((slot) =>
        slot.day === input.day
          ? {
              ...slot,
              meal: randomResult.meal,
              notes: currentSlot.notes,
            }
          : slot,
      ),
    },
  };
}

export function autofillEmptySlots(input: {
  plan: WeeklyPlan;
  filters: AutofillFilters;
  pickRandomMeal: (filters: RandomPickerFilters) => {
    meal: SuggestionMeal;
    candidateCount?: number;
    filtersApplied?: RandomPickerFilters;
  };
}) {
  const emptySlots = [...input.plan.slots]
    .filter((slot) => slot.meal == null)
    .sort((left, right) => left.day - right.day);

  if (emptySlots.length === 0) {
    return {
      plan: input.plan,
      autofillResult: {
        filledCount: 0,
        skippedCount: 0,
        emptyBeforeCount: 0,
        noMoreCandidates: false,
      },
    };
  }

  const excludeMealIds = new Set(listPlannedMealIds(input.plan));
  let nextPlan = input.plan;
  let filledCount = 0;
  let skippedCount = 0;
  let noMoreCandidates = false;

  for (let index = 0; index < emptySlots.length; index += 1) {
    const slot = emptySlots[index];

    try {
      const randomResult = input.pickRandomMeal({
        favoritesOnly: input.filters.favoritesOnly,
        fullMatchOnly: input.filters.fullMatchOnly,
        excludeServedWithinDays: input.filters.excludeServedWithinDays,
        excludeMealIds: [...excludeMealIds],
      });

      nextPlan = {
        ...nextPlan,
        slots: nextPlan.slots.map((candidate) =>
          candidate.day === slot.day
            ? {
                ...candidate,
                meal: randomResult.meal,
                notes: slot.notes,
              }
            : candidate,
        ),
      };
      excludeMealIds.add(randomResult.meal.id);
      filledCount += 1;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        noMoreCandidates = true;
        skippedCount = emptySlots.length - index;
        break;
      }

      throw error;
    }
  }

  return {
    plan: nextPlan,
    autofillResult: {
      filledCount,
      skippedCount,
      emptyBeforeCount: emptySlots.length,
      noMoreCandidates,
    },
  };
}
