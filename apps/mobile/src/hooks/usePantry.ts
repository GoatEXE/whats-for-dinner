import { useCallback, useEffect, useState } from 'react';

import * as pantryRepo from '../db/repos/pantry-repo';
import type { PantryItemInput } from '../db/types';
import type { PantryEntry } from '../types';
import { useDatabase } from './useDatabase';

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function toUiPantryEntry(item: { ingredientId: string; name: string }) {
  return {
    ingredientId: item.ingredientId,
    name: item.name,
    quantityText: null,
  } satisfies PantryEntry;
}

export function usePantry() {
  const { db, isReady, error: databaseError } = useDatabase();
  const [items, setItems] = useState<PantryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    if (!db) {
      return [] as PantryEntry[];
    }

    setLoading(true);

    try {
      const nextItems = pantryRepo.getAll(db).map(toUiPantryEntry);
      setItems(nextItems);
      setError(null);
      return nextItems;
    } catch (caughtError) {
      const nextError = toError(caughtError);
      setError(nextError);
      return [] as PantryEntry[];
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (databaseError) {
      setError(databaseError);
      return;
    }

    if (!isReady || !db) {
      return;
    }

    refresh();
  }, [databaseError, db, isReady, refresh]);

  const addItem = useCallback(
    (input: PantryItemInput | string) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const normalizedInput =
          typeof input === 'string' ? { name: input } : input;
        const nextItems = pantryRepo.addItem(db, normalizedInput).map(toUiPantryEntry);
        setItems(nextItems);
        setError(null);
        return nextItems;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db],
  );

  const removeItem = useCallback(
    (ingredientId: string) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const nextItems = pantryRepo.removeItem(db, ingredientId).map(toUiPantryEntry);
        setItems(nextItems);
        setError(null);
        return nextItems;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db],
  );

  const bulkSet = useCallback(
    (nextItems: PantryItemInput[]) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const updatedItems = pantryRepo.bulkSet(db, nextItems).map(toUiPantryEntry);
        setItems(updatedItems);
        setError(null);
        return updatedItems;
      } catch (caughtError) {
        const nextError = toError(caughtError);
        setError(nextError);
        throw nextError;
      }
    },
    [db],
  );

  const isOnHand = useCallback(
    (ingredientId: string) => {
      if (!db) {
        return false;
      }

      return pantryRepo.isOnHand(db, ingredientId);
    },
    [db],
  );

  return {
    items,
    pantryItems: items,
    loading,
    error,
    refresh,
    addItem,
    removeItem,
    bulkSet,
    isOnHand,
  };
}
