import { useMemo } from 'react';
import {
  buildShoppingList,
  type ShoppingListMeal,
  type ShoppingListResult,
} from '@whats-for-dinner/domain';
import type { AvailableIngredient } from '@whats-for-dinner/domain';
import { stringIdToNumber } from '../../db/ids';
import type { Meal, PantryEntry } from '../../types';

function mealToShoppingListMeal(meal: Meal): ShoppingListMeal {
  return {
    id: stringIdToNumber(meal.id),
    name: meal.name,
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

export interface UseShoppingListReturn {
  result: ShoppingListResult | null;
}

export function useShoppingList(
  selectedMeals: Meal[],
  pantryItems: PantryEntry[],
  includeOptional: boolean = false,
): UseShoppingListReturn {
  const result = useMemo<ShoppingListResult | null>(() => {
    if (selectedMeals.length === 0) return null;

    return buildShoppingList({
      meals: selectedMeals.map(mealToShoppingListMeal),
      availableIngredients: pantryToAvailable(pantryItems),
      includeOptional,
    });
  }, [selectedMeals, pantryItems, includeOptional]);

  return { result };
}
