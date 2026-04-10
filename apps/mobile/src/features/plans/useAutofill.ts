import { useCallback } from 'react';

import {
  autofillEmptySlots,
  pickRandomMeal,
  type AutofillFilters,
  type AvailableIngredient,
  type RandomPickerFilters,
  type SuggestionMeal,
} from '@whats-for-dinner/domain';

import * as plansRepo from '../../db/repos/weekly-plans-repo';
import type { DatabaseHandle } from '../../db/types';
import type { Meal } from '../../types';

interface AutofillDeps {
  db: DatabaseHandle | null;
  planId: string | null;
  meals: Meal[];
  pantryIngredientIds: string[];
  recentMealIds: string[];
}

function createNumericIdMap(ids: string[]) {
  const map = new Map<string, number>();
  let nextId = 1;

  for (const id of ids) {
    if (!map.has(id)) {
      map.set(id, nextId);
      nextId += 1;
    }
  }

  return map;
}

function toSuggestionMeal(
  meal: Meal,
  mealIdMap: Map<string, number>,
  ingredientIdMap: Map<string, number>,
): SuggestionMeal {
  return {
    id: mealIdMap.get(meal.id) ?? 0,
    name: meal.name,
    notes: meal.notes,
    prepMinutes: meal.prepMinutes,
    isFavorite: meal.isFavorite,
    tags: meal.tags,
    ingredients: meal.ingredients.map((ingredient) => ({
      ingredientId: ingredientIdMap.get(ingredient.id) ?? 0,
      name: ingredient.name,
      quantityText: ingredient.quantityText,
      isOptional: ingredient.isOptional,
    })),
  };
}

/**
 * Provides an autofill callback that wraps the shared domain autofill logic
 * with the mobile repo layer, similar to how useShoppingList wraps
 * the domain shopping list builder.
 */
export function useAutofill(deps: AutofillDeps) {
  const { db, planId, meals, pantryIngredientIds, recentMealIds } = deps;

  const autofill = useCallback(
    (
      filters: AutofillFilters = {
        favoritesOnly: false,
        fullMatchOnly: false,
        excludeServedWithinDays: 0,
      },
    ) => {
      if (!db || !planId) return null;

      const plan = plansRepo.getById(db, planId);
      if (!plan) return null;

      const mealIdMap = createNumericIdMap([
        ...meals.map((meal) => meal.id),
        ...plan.slots.flatMap((slot) => (slot.mealId ? [slot.mealId] : [])),
        ...recentMealIds,
      ]);
      const mealNumberToId = new Map(
        [...mealIdMap.entries()].map(([id, numericId]) => [numericId, id]),
      );

      const ingredientNameById = new Map<string, string>();
      meals.forEach((meal) => {
        meal.ingredients.forEach((ingredient) => {
          if (!ingredientNameById.has(ingredient.id)) {
            ingredientNameById.set(ingredient.id, ingredient.name);
          }
        });
      });

      const ingredientIdMap = createNumericIdMap([
        ...ingredientNameById.keys(),
        ...pantryIngredientIds,
      ]);

      const domainMeals: SuggestionMeal[] = meals
        .filter((meal) => !meal.isArchived)
        .map((meal) => toSuggestionMeal(meal, mealIdMap, ingredientIdMap));

      const availableIngredients: AvailableIngredient[] = [...new Set(pantryIngredientIds)]
        .map((ingredientId) => {
          const numericId = ingredientIdMap.get(ingredientId);
          if (numericId == null) return null;

          return {
            ingredientId: numericId,
            name: ingredientNameById.get(ingredientId) ?? '',
          };
        })
        .filter((ingredient): ingredient is AvailableIngredient => ingredient != null);

      const domainPlan = {
        id: 0,
        weekStart: plan.weekStart,
        slots: plan.slots.map((slot) => ({
          day: slot.day,
          date: '',
          label: '',
          meal: slot.mealId
            ? {
                id: mealIdMap.get(slot.mealId) ?? 0,
                name: slot.mealName ?? undefined,
              }
            : null,
          notes: slot.notes,
          served: slot.servedAt !== null,
        })),
      };

      const pickRandom = (pickerFilters: RandomPickerFilters) => {
        return pickRandomMeal({
          meals: domainMeals,
          recentMealIds: recentMealIds
            .map((mealId) => mealIdMap.get(mealId))
            .filter((mealId): mealId is number => mealId != null),
          availableIngredients,
          filters: pickerFilters,
        });
      };

      const result = autofillEmptySlots({
        plan: domainPlan,
        filters,
        pickRandomMeal: pickRandom,
      });

      for (const slot of result.plan.slots) {
        if (!slot.meal) {
          continue;
        }

        const mealId = mealNumberToId.get(slot.meal.id);
        if (!mealId) {
          continue;
        }

        plansRepo.assignSlot(db, planId, slot.day, mealId);
      }

      return result.autofillResult;
    },
    [db, planId, meals, pantryIngredientIds, recentMealIds],
  );

  return { autofill };
}
