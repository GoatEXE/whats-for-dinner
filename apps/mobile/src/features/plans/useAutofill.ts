import { useCallback } from 'react';

import {
  autofillEmptySlots,
  type AutofillFilters,
} from '@whats-for-dinner/domain';
import { pickRandomMeal, type RandomPickerFilters } from '@whats-for-dinner/domain';
import { findMatches } from '@whats-for-dinner/domain';

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

/**
 * Provides an autofill callback that wraps the shared domain autofill logic
 * with the mobile repo layer, similar to how useShoppingList wraps
 * the domain shopping list builder.
 */
export function useAutofill(deps: AutofillDeps) {
  const { db, planId, meals, pantryIngredientIds, recentMealIds } = deps;

  const autofill = useCallback(
    (filters: AutofillFilters = { favoritesOnly: false, fullMatchOnly: false, excludeServedWithinDays: 0 }) => {
      if (!db || !planId) return null;

      const plan = plansRepo.getById(db, planId);
      if (!plan) return null;

      // Build the domain-compatible plan shape
      const domainPlan = {
        id: 0, // domain expects numeric but only uses it as passthrough
        weekStart: plan.weekStart,
        slots: plan.slots.map((slot) => ({
          day: slot.day,
          date: '',
          label: '',
          meal: slot.mealId
            ? { id: 0, name: slot.mealName ?? undefined } // domain placeholder
            : null,
          notes: slot.notes,
          served: slot.servedAt !== null,
        })),
      };

      // Build the domain-compatible meals list for the random picker
      const domainMeals = meals
        .filter((m) => !m.isArchived)
        .map((m) => ({
          id: m.id as unknown as number,
          name: m.name,
          isFavorite: m.isFavorite,
          isArchived: m.isArchived,
          ingredientIds: m.ingredients.map((i) => i.id as unknown as number),
        }));

      const pickRandom = (pickerFilters: RandomPickerFilters) => {
        const result = pickRandomMeal({
          meals: domainMeals,
          pantryIngredientIds: pantryIngredientIds as unknown as number[],
          recentMealIds: recentMealIds as unknown as number[],
          filters: pickerFilters,
          findMatches: (candidateMeals, pantryIds) =>
            findMatches(candidateMeals, pantryIds),
        });
        return result;
      };

      const result = autofillEmptySlots({
        plan: domainPlan,
        filters,
        pickRandomMeal: pickRandom,
      });

      // Write filled slots back to DB
      for (const slot of result.plan.slots) {
        if (slot.meal) {
          const mealId = String(slot.meal.id);
          plansRepo.assignSlot(db, planId, slot.day, mealId);
        }
      }

      return result.autofillResult;
    },
    [db, planId, meals, pantryIngredientIds, recentMealIds],
  );

  return { autofill };
}
