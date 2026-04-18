import { HttpError } from "./errors";
import type { AvailableIngredient } from "./ingredient-resolution";
import { findMatches, type SuggestionMeal } from "./suggestions";

export interface RandomPickerFilters {
  favoritesOnly: boolean;
  fullMatchOnly: boolean;
  excludeServedWithinDays: number;
  excludeMealIds?: number[];
}

export interface ListRandomMealCandidatesInput {
  meals: SuggestionMeal[];
  recentMealIds?: number[];
  availableIngredients?: AvailableIngredient[];
  filters: RandomPickerFilters;
}

export function listRandomMealCandidates(input: ListRandomMealCandidatesInput) {
  const recentMealIds = new Set(input.recentMealIds ?? []);
  const excludedMealIds = new Set(input.filters.excludeMealIds ?? []);
  let candidates = input.meals
    .filter((meal) => !input.filters.favoritesOnly || meal.isFavorite)
    .filter((meal) => !recentMealIds.has(meal.id))
    .filter((meal) => !excludedMealIds.has(meal.id));

  if (input.filters.fullMatchOnly) {
    const matches = findMatches({
      meals: input.meals,
      availableIngredients: input.availableIngredients ?? [],
      favoritesOnly: input.filters.favoritesOnly,
      includePartial: false,
    }).matches;
    const fullMatchIds = new Set(matches.map((match) => match.id));
    candidates = candidates.filter((meal) => fullMatchIds.has(meal.id));
  }

  return candidates;
}

export function pickRandomMeal(
  input: ListRandomMealCandidatesInput & { random?: () => number },
) {
  const candidates = listRandomMealCandidates(input);

  if (candidates.length === 0) {
    throw new HttpError(404, "No meals matched the random selection filters");
  }

  const random = input.random ?? Math.random;
  const selectedMeal = candidates[Math.floor(random() * candidates.length)];

  return {
    meal: selectedMeal,
    candidateCount: candidates.length,
    filtersApplied: input.filters,
  };
}
