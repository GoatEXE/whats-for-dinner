import { useCallback, useEffect, useState } from 'react';

import * as historyRepo from '../db/repos/history-repo';
import type { HistoryWriteInput } from '../db/types';
import type { HistoryEntry } from '../types';
import { useDatabase } from './useDatabase';

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function toUiHistoryEntry(entry: {
  id: string;
  mealId: string;
  mealName: string;
  servedOn: string;
}) {
  return {
    id: entry.id,
    mealId: entry.mealId,
    mealName: entry.mealName,
    servedOn: entry.servedOn,
  } satisfies HistoryEntry;
}

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function useHistory(initialLimit = 20) {
  const { db, isReady, error: databaseError } = useDatabase();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [limit, setLimit] = useState(initialLimit);

  const refresh = useCallback(
    (nextLimit = limit) => {
      if (!db) {
        return [] as HistoryEntry[];
      }

      setLoading(true);
      setLimit(nextLimit);

      try {
        const nextEntries = historyRepo.getRecent(db, nextLimit).map(toUiHistoryEntry);
        setEntries(nextEntries);
        setError(null);
        return nextEntries;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        return [] as HistoryEntry[];
      } finally {
        setLoading(false);
      }
    },
    [db, limit],
  );

  useEffect(() => {
    if (databaseError) {
      setError(databaseError);
      return;
    }

    if (!isReady || !db) {
      return;
    }

    refresh(limit);
  }, [databaseError, db, isReady, limit, refresh]);

  const record = useCallback(
    (input: HistoryWriteInput) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const entry = toUiHistoryEntry(historyRepo.record(db, input));
        refresh(limit);
        return entry;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db, limit, refresh],
  );

  const getByMeal = useCallback(
    (mealId: string) => {
      if (!db) {
        return [] as HistoryEntry[];
      }

      return historyRepo.getByMeal(db, mealId).map(toUiHistoryEntry);
    },
    [db],
  );

  const getAll = useCallback(() => {
    if (!db) {
      return [] as HistoryEntry[];
    }

    return historyRepo.getAll(db).map(toUiHistoryEntry);
  }, [db]);

  const getRecentMealIds = useCallback(
    (days: number) => {
      if (days <= 0) {
        return [] as string[];
      }

      const cutoff = isoDateDaysAgo(days);

      return getAll()
        .filter((entry) => entry.servedOn >= cutoff)
        .map((entry) => entry.mealId)
        .filter((mealId, index, values) => values.indexOf(mealId) === index);
    },
    [getAll],
  );

  return {
    entries,
    loading,
    error,
    limit,
    refresh,
    record,
    getByMeal,
    getAll,
    getRecentMealIds,
  };
}
