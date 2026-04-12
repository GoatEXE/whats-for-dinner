import { exportMealsEnvelope } from '@whats-for-dinner/domain';

import type { MealRecord } from '../../db/types';

/**
 * Shape of a single meal entry inside the export envelope.
 * Intentionally matches what exportMealsEnvelope expects.
 */
export interface ExportMealEntry {
  name: string;
  notes?: string | null;
  prepMinutes?: number | null;
  isFavorite?: boolean;
  tags?: string[];
  ingredients: Array<{
    name: string;
    quantityText?: string | null;
    isOptional?: boolean;
  }>;
}

/**
 * Build a timestamped filename for the export file.
 * Uses a compact YYYYMMDD-HHmmss format for easy sorting and recognition.
 *
 * @param now - Override for deterministic tests. Defaults to current time.
 */
export function buildExportFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  return `whats-for-dinner-${stamp}.json`;
}

/**
 * Convert DB MealRecords → the portable export entries the domain envelope expects.
 */
export function mealsToExportEntries(records: MealRecord[]): ExportMealEntry[] {
  return records.map((m) => ({
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
  }));
}

/**
 * Build the full export JSON string from DB meal records.
 *
 * @param records - MealRecord[] from the repo
 * @param exportedAt - Override for deterministic tests
 * @returns Pretty-printed JSON string ready to write/share
 */
export function buildExportJson(
  records: MealRecord[],
  exportedAt?: string,
): string {
  const entries = mealsToExportEntries(records);
  const envelope = exportMealsEnvelope(entries, exportedAt);
  return JSON.stringify(envelope, null, 2);
}

/**
 * Build a human-readable summary of the export for display.
 */
export function buildExportSummary(
  mealCount: number,
  includesArchived: boolean,
): string {
  const archiveNote = includesArchived ? ' (including archived)' : '';
  const mealWord = mealCount === 1 ? 'meal' : 'meals';
  return `${mealCount} ${mealWord}${archiveNote}`;
}
