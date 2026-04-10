import { useCallback, useState } from 'react';

import {
  importMeals,
  type ImportedMealSummary,
  type ImportSkippedMeal,
  type ImportFailedMeal,
} from '@whats-for-dinner/domain';

import * as mealsRepo from '../../db/repos/meals-repo';
import type { DatabaseHandle, MealWriteInput } from '../../db/types';
import { useDatabase } from '../../hooks/useDatabase';

export interface ImportResult {
  imported: ImportedMealSummary[];
  skipped: ImportSkippedMeal[];
  failed: ImportFailedMeal[];
  summary: {
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    totalCount: number;
  };
}

export interface UseFileImportReturn {
  importing: boolean;
  result: ImportResult | null;
  error: string | null;
  importFromJson: (jsonString: string) => ImportResult | null;
  reset: () => void;
}

/**
 * Feature hook that wires domain import-export logic to the mobile meals repo.
 * Accepts a JSON string (from a file picker), validates against the recipe
 * envelope schema, and persists imported meals into local SQLite.
 */
export function useFileImport(): UseFileImportReturn {
  const { db } = useDatabase();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFromJson = useCallback(
    (jsonString: string): ImportResult | null => {
      if (!db) {
        setError('Database is not ready');
        return null;
      }

      setImporting(true);
      setError(null);
      setResult(null);

      try {
        const payload = JSON.parse(jsonString);

        // Get existing meals for dedupe
        const existingMeals = mealsRepo.getAll(db).map((m) => ({ name: m.name }));

        // Run domain import with a callback that persists each meal
        const importResult = importMeals(payload, {
          existingMeals,
          importMeal: (mealData) => {
            const input: MealWriteInput = {
              name: mealData.name,
              notes: mealData.notes ?? null,
              prepMinutes: mealData.prepMinutes ?? null,
              isFavorite: mealData.isFavorite ?? false,
              ingredients: mealData.ingredients.map((i) => ({
                name: i.name,
                quantityText: i.quantityText ?? null,
                isOptional: i.isOptional ?? false,
              })),
              tags: mealData.tags ?? [],
            };

            const created = mealsRepo.create(db, input);
            return { name: created.name };
          },
        });

        const outcome: ImportResult = importResult.data;
        setResult(outcome);
        return outcome;
      } catch (err) {
        const message = err instanceof SyntaxError
          ? 'Invalid JSON file'
          : err instanceof Error
            ? err.message
            : String(err);
        setError(message);
        return null;
      } finally {
        setImporting(false);
      }
    },
    [db],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { importing, result, error, importFromJson, reset };
}
