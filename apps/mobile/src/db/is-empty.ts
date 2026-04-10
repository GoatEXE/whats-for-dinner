import type { DatabaseHandle } from "./types";

/**
 * Returns true when the meals table has no live rows. Used to decide whether
 * to auto-seed sample data on first launch.
 */
export function isDatabaseEmpty(db: DatabaseHandle): boolean {
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM meals WHERE deleted_at IS NULL",
  );
  return !row || Number(row.count) === 0;
}
