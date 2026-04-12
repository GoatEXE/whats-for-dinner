import { useCallback, useState } from 'react';

import * as mealsRepo from '../../db/repos/meals-repo';
import type { MealRecord } from '../../db/types';
import { useDatabase } from '../../hooks/useDatabase';
import {
  buildExportFilename,
  buildExportJson,
  buildExportSummary,
} from './export-helpers';

export interface ExportResult {
  json: string;
  filename: string;
  summary: string;
  mealCount: number;
}

export interface UseExportReturn {
  exporting: boolean;
  error: string | null;
  /**
   * Build the export JSON and metadata.
   * Returns the payload ready to share/save, or null on error.
   */
  exportMeals: (options?: { includeArchived?: boolean }) => ExportResult | null;
}

/**
 * Feature hook that builds the recipe export envelope from local SQLite
 * and returns it along with a filename and human-readable summary.
 * The caller can share it via Expo Sharing, write to file, or copy to clipboard.
 */
export function useExport(): UseExportReturn {
  const { db } = useDatabase();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportMeals = useCallback(
    (options: { includeArchived?: boolean } = {}): ExportResult | null => {
      if (!db) {
        setError('Database is not ready');
        return null;
      }

      setExporting(true);
      setError(null);

      try {
        let records: MealRecord[];

        if (options.includeArchived) {
          // getAll(archived: undefined) defaults to non-archived only,
          // so we fetch both buckets and merge to include everything.
          const active = mealsRepo.getAll(db, { archived: false, includeDeleted: false });
          const archived = mealsRepo.getAll(db, { archived: true, includeDeleted: false });
          records = [...active, ...archived];
        } else {
          records = mealsRepo.getAll(db, { archived: false, includeDeleted: false });
        }

        const json = buildExportJson(records);
        const filename = buildExportFilename();
        const summary = buildExportSummary(records.length, !!options.includeArchived);

        return { json, filename, summary, mealCount: records.length };
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
