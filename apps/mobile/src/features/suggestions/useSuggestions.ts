import { useMemo } from 'react';
import {
  findMatches,
  type SuggestionMatch,
  type SuggestionMeal,
} from '@whats-for-dinner/domain';
import type { AvailableIngredient } from '@whats-for-dinner/domain';
import { stringIdToNumber } from '../../db/ids';
import type { Meal, PantryEntry } from '../../types';

function mealToSuggestionMeal(meal: Meal): SuggestionMeal {
  return {
    id: stringIdToNumber(meal.id),
    name: meal.name,
    notes: meal.notes,
    prepMinutes: meal.prepMinutes,
    isFavorite: meal.isFavorite,
    tags: meal.tags,
    ingredients: meal.ingredients.map((i) => ({
      ingredientId: stringIdToNumber(i.id),
      name: i.name,
      quantityText: i.quantityText,
      isOptional: i.isOptional,
    })),
  };
}

function pantryToAvailable(items: PantryEntry[]): AvailableIngredient[] {
  return items.map((p) => ({
    ingredientId: stringIdToNumber(p.ingredientId),
    name: p.name,
  }));
}

export interface UseSuggestionsReturn {
  matches: SuggestionMatch[];
}

export function useSuggestions(
  meals: Meal[],
  pantryItems: PantryEntry[],
  options: { favoritesOnly?: boolean; includePartial?: boolean } = {},
): UseSuggestionsReturn {
  const matches = useMemo(() => {
    if (pantryItems.length === 0) return [];

    const result = findMatches({
      meals: meals.filter((m) => !m.isArchived).map(mealToSuggestionMeal),
      availableIngredients: pantryToAvailable(pantryItems),
      favoritesOnly: options.favoritesOnly ?? false,
      includePartial: options.includePartial ?? true,
    });

    return result.matches;
  }, [meals, pantryItems, options.favoritesOnly, options.includePartial]);

  return { matches };
}
