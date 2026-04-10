import { useCallback, useEffect, useState } from 'react';

import * as plansRepo from '../db/repos/weekly-plans-repo';
import type { WeeklyPlanWithSlots } from '../db/types';
import type { WeeklyPlan, WeeklyPlanSlot } from '../types';
import { useDatabase } from './useDatabase';

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function toUiSlot(record: { day: number; mealId: string | null; mealName: string | null; notes: string | null; servedAt: string | null }): WeeklyPlanSlot {
  return {
    day: record.day,
    mealId: record.mealId,
    mealName: record.mealName,
    notes: record.notes,
  };
}

function toUiPlan(record: WeeklyPlanWithSlots): WeeklyPlan {
  return {
    id: record.id,
    weekStart: record.weekStart,
    slots: record.slots.map(toUiSlot),
  };
}

export interface UseWeeklyPlanReturn {
  plan: WeeklyPlan | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createPlan: (weekStart: string) => WeeklyPlan;
  archivePlan: (planId: string) => void;
  assignSlot: (day: number, mealId: string, mealName: string) => Promise<void>;
  clearSlot: (day: number) => Promise<void>;
  serveSlot: (day: number) => Promise<void>;
  autofill: () => Promise<void>;
  getPlannedMealIds: () => string[];
}

export function useWeeklyPlan(): UseWeeklyPlanReturn {
  const { db, isReady, error: databaseError } = useDatabase();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!db) return;
    setLoading(true);
    try {
      const current = plansRepo.getOrCreateCurrent(db);
      setPlan(toUiPlan(current));
      setError(null);
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (databaseError) {
      setError(databaseError.message);
      return;
    }
    if (!isReady || !db) return;
    refresh();
  }, [databaseError, db, isReady, refresh]);

  const createPlan = useCallback(
    (weekStart: string) => {
      if (!db) throw new Error('Database is not ready');
      const created = plansRepo.create(db, weekStart);
      const uiPlan = toUiPlan(created);
      setPlan(uiPlan);
      return uiPlan;
    },
    [db],
  );

  const archivePlan = useCallback(
    (planId: string) => {
      if (!db) throw new Error('Database is not ready');
      plansRepo.archive(db, planId);
      refresh();
    },
    [db, refresh],
  );

  const assignSlot = useCallback(
    async (day: number, mealId: string, _mealName: string) => {
      if (!db || !plan) return;
      try {
        plansRepo.assignSlot(db, plan.id, day, mealId);
        refresh();
      } catch (err) {
        setError(toError(err).message);
      }
    },
    [db, plan, refresh],
  );

  const clearSlot = useCallback(
    async (day: number) => {
      if (!db || !plan) return;
      try {
        plansRepo.clearSlot(db, plan.id, day);
        refresh();
      } catch (err) {
        setError(toError(err).message);
      }
    },
    [db, plan, refresh],
  );

  const serveSlot = useCallback(
    async (day: number) => {
      if (!db || !plan) return;
      try {
        plansRepo.serveSlot(db, plan.id, day);
        refresh();
      } catch (err) {
        setError(toError(err).message);
      }
    },
    [db, plan, refresh],
  );

  const autofill = useCallback(async () => {
    // Autofill is delegated to the feature hook (useAutofill) which composes
    // domain logic with the repo layer. The base hook exposes this as a no-op
    // placeholder; real autofill orchestration happens in features/plans/.
  }, []);

  const getPlannedMealIds = useCallback(() => {
    if (!db || !plan) return [] as string[];
    try {
      return plansRepo.getPlannedMealIds(db, plan.id);
    } catch {
      return [] as string[];
    }
  }, [db, plan]);

  return {
    plan,
    loading,
    error,
    refresh,
    createPlan,
    archivePlan,
    assignSlot,
    clearSlot,
    serveSlot,
    autofill,
    getPlannedMealIds,
  };
}
