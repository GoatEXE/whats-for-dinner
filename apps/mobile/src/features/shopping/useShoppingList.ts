import { useMemo } from 'react';
import {
  buildShoppingList,
  type ShoppingListMeal,
  type ShoppingListResult,
} from '@whats-for-dinner/domain';
import type { AvailableIngredient } from '@whats-for-dinner/domain';
import type { Meal, PantryEntry } from '../../types';

function mealToShoppingListMeal(meal: Meal): ShoppingListMeal {
  return {
    id: Number(meal.id) || meal.id.charCodeAt(0), // domain uses number ids
    name: meal.name,
    ingredients: meal.ingredients.map((i) => ({
      ingredientId: Number(i.id) || i.id.charCodeAt(0),
      name: i.name,
      quantityText: i.quantityText,
      isOptional: i.isOptional,
    })),
  };
}

function pantryToAvailable(items: PantryEntry[]): AvailableIngredient[] {
  return items.map((p) => ({
    ingredientId: Number(p.ingredientId) || p.ingredientId.charCodeAt(0),
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
