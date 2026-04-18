import type { DatabaseHandle } from "./types";
import { seedSampleData } from "./seed";

/**
 * Wipe every user-facing table and re-seed with sample data. Intended for
 * demo scenarios where you want a clean, populated state between showings.
 */
export function resetAndReseed(db: DatabaseHandle): void {
  // Order matters for foreign keys, even with ON DELETE CASCADE.
  db.runSync("DELETE FROM weekly_plan_slots");
  db.runSync("DELETE FROM weekly_plans");
  db.runSync("DELETE FROM meal_history");
  db.runSync("DELETE FROM meal_tags");
  db.runSync("DELETE FROM meal_ingredients");
  db.runSync("DELETE FROM meals");
  db.runSync("DELETE FROM pantry_items");
  db.runSync("DELETE FROM tags");
  db.runSync("DELETE FROM ingredients");
  seedSampleData(db);
}
