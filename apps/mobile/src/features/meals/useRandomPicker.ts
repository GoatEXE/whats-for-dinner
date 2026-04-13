import { useState, useCallback } from 'react';
import { pickRandomMeal, type SuggestionMeal } from '@whats-for-dinner/domain';
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

export interface RandomPickerResult {
  meal: SuggestionMeal;
  candidateCount: number;
}

export interface UseRandomPickerReturn {
  pick: RandomPickerResult | null;
  error: string | null;
  roll: () => void;
  accept: () => void;
  clear: () => void;
}

export function useRandomPicker(
  meals: Meal[],
  pantryItems: PantryEntry[],
  recentMealIds: number[],
  options: {
    favoritesOnly?: boolean;
    fullMatchOnly?: boolean;
    excludeServedWithinDays?: number;
    excludeMealIds?: number[];
  } = {},
): UseRandomPickerReturn {
  const [pick, setPick] = useState<RandomPickerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roll = useCallback(() => {
    try {
      setError(null);
      const activeMeals = meals.filter((m) => !m.isArchived);
      const result = pickRandomMeal({
        meals: activeMeals.map(mealToSuggestionMeal),
        recentMealIds,
        availableIngredients: pantryToAvailable(pantryItems),
        filters: {
          favoritesOnly: options.favoritesOnly ?? false,
          fullMatchOnly: options.fullMatchOnly ?? false,
          excludeServedWithinDays: options.excludeServedWithinDays ?? 0,
          excludeMealIds: options.excludeMealIds,
        },
      });
      setPick({ meal: result.meal, candidateCount: result.candidateCount });
    } catch (e) {
      setPick(null);
      setError(
        e instanceof Error ? e.message : 'No meals matched the filters',
      );
    }
  }, [meals, pantryItems, recentMealIds, options]);

  const accept = useCallback(() => {
    setPick(null);
  }, []);

  const clear = useCallback(() => {
    setPick(null);
    setError(null);
  }, []);

  return { pick, error, roll, accept, clear };
}
