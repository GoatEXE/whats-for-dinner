import { useCallback, useState } from 'react';

import { exportMealsEnvelope } from '@whats-for-dinner/domain';

import * as mealsRepo from '../../db/repos/meals-repo';
import { useDatabase } from '../../hooks/useDatabase';

export interface UseExportReturn {
  exporting: boolean;
  error: string | null;
  /** Returns the JSON string of the export envelope, ready to share/save. */
  exportMeals: (options?: { includeArchived?: boolean }) => string | null;
}

/**
 * Feature hook that builds the recipe export envelope from local SQLite
 * and returns it as a JSON string. The caller can share it via Expo Sharing,
 * write to file, or copy to clipboard.
 */
export function useExport(): UseExportReturn {
  const { db } = useDatabase();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportMeals = useCallback(
    (options: { includeArchived?: boolean } = {}): string | null => {
      if (!db) {
        setError('Database is not ready');
        return null;
      }

      setExporting(true);
      setError(null);

      try {
        const allMeals = mealsRepo.getAll(db, {
          archived: options.includeArchived ? undefined : false,
          includeDeleted: false,
        });

        const envelope = exportMealsEnvelope(
          allMeals.map((m) => ({
            name: m.name,
            notes: m.notes,
            prepMinutes: m.prepMinutes,
            isFavorite: m.isFavorite,
            tags: m.tags,
            ingredients: m.ingredients.map((i) => ({
              name: i.name,
              quantityText: i.quantityText,
              isOptional: i.isOptional,
            })),
          })),
        );

        return JSON.stringify(envelope, null, 2);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setExporting(false);
      }
    },
    [db],
  );

  return { exporting, error, exportMeals };
}
