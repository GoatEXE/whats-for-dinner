import { useCallback, useEffect, useRef, useState } from 'react';

import * as mealsRepo from '../db/repos/meals-repo';
import type {
  MealListFilters,
  MealRecord,
  MealUpdateInput,
  MealWriteInput,
} from '../db/types';
import type { Meal } from '../types';
import { useDatabase } from './useDatabase';

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function toUiMeal(record: MealRecord): Meal {
  return {
    id: record.id,
    name: record.name,
    notes: record.notes,
    prepMinutes: record.prepMinutes,
    isFavorite: record.isFavorite,
    isArchived: record.isArchived,
    sourceUrl: record.sourceUrl,
    sourceHost: record.sourceHost,
    tags: record.tags,
    ingredients: record.ingredients.map((ingredient) => ({
      id: ingredient.ingredientId,
      name: ingredient.name,
      quantityText: ingredient.quantityText,
      isOptional: ingredient.isOptional,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function useMeals(initialFilters: MealListFilters = {}) {
  const { db, isReady, error: databaseError } = useDatabase();
  const filtersRef = useRef<MealListFilters>(initialFilters);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(
    (nextFilters?: MealListFilters) => {
      if (!db) {
        return [] as Meal[];
      }

      const resolvedFilters = nextFilters ?? filtersRef.current;
      filtersRef.current = resolvedFilters;
      setLoading(true);

      try {
        const nextMeals = mealsRepo.getAll(db, resolvedFilters).map(toUiMeal);
        setMeals(nextMeals);
        setError(null);
        return nextMeals;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        return [] as Meal[];
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  useEffect(() => {
    if (databaseError) {
      setError(databaseError);
      return;
    }

    if (!isReady || !db) {
      return;
    }

    refresh(filtersRef.current);
  }, [databaseError, db, isReady, refresh]);

  const createMeal = useCallback(
    (input: MealWriteInput) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const meal = toUiMeal(mealsRepo.create(db, input));
        refresh();
        return meal;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, refresh],
  );

  const updateMeal = useCallback(
    (mealId: string, input: MealUpdateInput) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const meal = mealsRepo.update(db, mealId, input);
        refresh();
        return meal ? toUiMeal(meal) : null;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, refresh],
  );

  const archiveMeal = useCallback(
    (mealId: string, archived = true) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const meal = mealsRepo.archive(db, mealId, archived);
        refresh();
        return meal ? toUiMeal(meal) : null;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, refresh],
  );

  const toggleFavorite = useCallback(
    (mealId: string, nextValue?: boolean) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const meal = mealsRepo.toggleFavorite(db, mealId, nextValue);
        refresh();
        return meal ? toUiMeal(meal) : null;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, refresh],
  );

  const deleteMeal = useCallback(
    (mealId: string) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const meal = mealsRepo.delete(db, mealId);
        refresh();
        return meal ? toUiMeal(meal) : null;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, refresh],
  );

  const getMealById = useCallback(
    (mealId: string) => {
      if (!db) {
        return null;
      }

      const meal = mealsRepo.getById(db, mealId);
      return meal ? toUiMeal(meal) : null;
    },
    [db],
  );

  const search = useCallback(
    (query: string, filters: Omit<MealListFilters, 'q'> = {}) => {
      if (!db) {
        return [] as Meal[];
      }

      const nextFilters = {
        ...filters,
        q: query,
      } satisfies MealListFilters;

      filtersRef.current = nextFilters;
      setLoading(true);

      try {
        const results = mealsRepo.search(db, query, filters).map(toUiMeal);
        setMeals(results);
        setError(null);
        return results;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        return [] as Meal[];
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  return {
    meals,
    loading,
    error,
    refresh,
    search,
    getMealById,
    getMeal: getMealById,
    createMeal,
    updateMeal,
    archiveMeal,
    toggleArchived: archiveMeal,
    toggleFavorite,
    deleteMeal,
  };
}
