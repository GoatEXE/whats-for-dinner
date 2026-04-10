// TODO: replace with real DB-backed weekly-plan repo in a later phase.
import { useCallback, useState } from 'react';

import type { WeeklyPlan, WeeklyPlanSlot } from '../types';

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function emptySlots(): WeeklyPlanSlot[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    mealId: null,
    mealName: null,
    notes: null,
  }));
}

const MOCK_PLAN: WeeklyPlan = {
  id: 'current-week',
  weekStart: getCurrentWeekStart(),
  slots: emptySlots(),
};

export interface UseWeeklyPlanReturn {
  plan: WeeklyPlan | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  assignSlot: (day: number, mealId: string, mealName: string) => Promise<void>;
  clearSlot: (day: number) => Promise<void>;
  autofill: () => Promise<void>;
  getPlannedMealIds: () => string[];
}

export function useWeeklyPlan(): UseWeeklyPlanReturn {
  const [plan, setPlan] = useState<WeeklyPlan | null>(MOCK_PLAN);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refresh = useCallback(() => {
    // TODO: reload from DB once weekly-plan repositories are added.
  }, []);

  const assignSlot = useCallback(
    async (day: number, mealId: string, mealName: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const slots = prev.slots.map((slot) =>
          slot.day === day ? { ...slot, mealId, mealName } : slot,
        );
        return { ...prev, slots };
      });
    },
    [],
  );

  const clearSlot = useCallback(async (day: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const slots = prev.slots.map((slot) =>
        slot.day === day ? { ...slot, mealId: null, mealName: null } : slot,
      );
      return { ...prev, slots };
    });
  }, []);

  const autofill = useCallback(async () => {
    // TODO: implement autofill using the shared weekly-plan domain helpers.
  }, []);

  const getPlannedMealIds = useCallback(() => {
    if (!plan) {
      return [] as string[];
    }

    return plan.slots
      .filter((slot) => slot.mealId !== null)
      .map((slot) => slot.mealId as string);
  }, [plan]);

  return { plan, loading, error, refresh, assignSlot, clearSlot, autofill, getPlannedMealIds };
}
