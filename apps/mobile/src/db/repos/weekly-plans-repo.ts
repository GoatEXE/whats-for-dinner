import { generateHistoryId, generatePlanId } from "../ids";
import { fromSqliteBoolean, toSqliteBoolean, todayIsoDate } from "../repo-helpers";
import type {
  DatabaseHandle,
  WeeklyPlanRecord,
  WeeklyPlanSlotRecord,
  WeeklyPlanWithSlots,
} from "../types";

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface PlanRow {
  id: string;
  weekStart: string;
  isArchived: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface SlotRow {
  planId: string;
  day: number;
  mealId: string | null;
  mealName: string | null;
  customName: string | null;
  notes: string | null;
  servedAt: string | null;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function mapPlanRow(row: PlanRow): WeeklyPlanRecord {
  return {
    id: row.id,
    weekStart: row.weekStart,
    isArchived: fromSqliteBoolean(row.isArchived),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function mapSlotRow(row: SlotRow): WeeklyPlanSlotRecord {
  return {
    planId: row.planId,
    day: row.day,
    mealId: row.mealId,
    mealName: row.mealName,
    customName: row.customName,
    notes: row.notes,
    servedAt: row.servedAt,
  };
}

function getSlotsForPlan(db: DatabaseHandle, planId: string): WeeklyPlanSlotRecord[] {
  const rows = db.getAllSync<SlotRow>(
    `SELECT
       s.plan_id   AS planId,
       s.day,
       s.meal_id   AS mealId,
       m.name       AS mealName,
       s.custom_name AS customName,
       s.notes,
       s.served_at  AS servedAt
     FROM weekly_plan_slots s
     LEFT JOIN meals m ON m.id = s.meal_id
     WHERE s.plan_id = ?
     ORDER BY s.day`,
    planId,
  );
  return rows.map(mapSlotRow);
}

function withSlots(db: DatabaseHandle, plan: WeeklyPlanRecord): WeeklyPlanWithSlots {
  return { ...plan, slots: getSlotsForPlan(db, plan.id) };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getCurrent(db: DatabaseHandle): WeeklyPlanWithSlots | null {
  const row = db.getFirstSync<PlanRow>(
    `SELECT id, week_start AS weekStart, is_archived AS isArchived,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM weekly_plans
     WHERE is_archived = 0 AND deleted_at IS NULL
     ORDER BY week_start DESC
     LIMIT 1`,
  );
  return row ? withSlots(db, mapPlanRow(row)) : null;
}

export function getById(db: DatabaseHandle, planId: string): WeeklyPlanWithSlots | null {
  const row = db.getFirstSync<PlanRow>(
    `SELECT id, week_start AS weekStart, is_archived AS isArchived,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM weekly_plans
     WHERE id = ? AND deleted_at IS NULL`,
    planId,
  );
  return row ? withSlots(db, mapPlanRow(row)) : null;
}

export function listArchived(
  db: DatabaseHandle,
  limit = 10,
): WeeklyPlanWithSlots[] {
  const rows = db.getAllSync<PlanRow>(
    `SELECT id, week_start AS weekStart, is_archived AS isArchived,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM weekly_plans
     WHERE is_archived = 1 AND deleted_at IS NULL
     ORDER BY week_start DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(mapPlanRow).map((plan) => withSlots(db, plan));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function ensureSlots(db: DatabaseHandle, planId: string) {
  for (let day = 0; day < 7; day++) {
    db.runSync(
      `INSERT OR IGNORE INTO weekly_plan_slots (plan_id, day)
       VALUES (?, ?)`,
      planId,
      day,
    );
  }
}

export function create(db: DatabaseHandle, weekStart: string): WeeklyPlanWithSlots {
  const id = generatePlanId();
  db.runSync(
    `INSERT INTO weekly_plans (id, week_start) VALUES (?, ?)`,
    id,
    weekStart,
  );
  ensureSlots(db, id);
  return getById(db, id)!;
}

export function getOrCreateCurrent(db: DatabaseHandle): WeeklyPlanWithSlots {
  const existing = getCurrent(db);
  if (existing) return existing;

  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const weekStart = monday.toISOString().slice(0, 10);

  return create(db, weekStart);
}

export function archive(db: DatabaseHandle, planId: string): WeeklyPlanWithSlots | null {
  db.runSync(
    `UPDATE weekly_plans SET is_archived = 1 WHERE id = ?`,
    planId,
  );
  return getById(db, planId);
}

export function assignSlot(
  db: DatabaseHandle,
  planId: string,
  day: number,
  mealId: string | null,
  notes?: string | null,
): WeeklyPlanSlotRecord {
  // Upsert the slot
  db.runSync(
    `INSERT INTO weekly_plan_slots (plan_id, day, meal_id, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (plan_id, day) DO UPDATE SET
       meal_id = excluded.meal_id,
       notes = COALESCE(excluded.notes, notes)`,
    planId,
    day,
    mealId,
    notes ?? null,
  );

  // Mark parent plan as updated
  db.runSync(
    `UPDATE weekly_plans SET updated_at = datetime('now') WHERE id = ?`,
    planId,
  );

  const slots = getSlotsForPlan(db, planId);
  return slots.find((s) => s.day === day)!;
}

export function clearSlot(
  db: DatabaseHandle,
  planId: string,
  day: number,
): void {
  db.runSync(
    `UPDATE weekly_plan_slots
     SET meal_id = NULL, notes = NULL, served_at = NULL
     WHERE plan_id = ? AND day = ?`,
    planId,
    day,
  );
  db.runSync(
    `UPDATE weekly_plans SET updated_at = datetime('now') WHERE id = ?`,
    planId,
  );
}

export function serveSlot(
  db: DatabaseHandle,
  planId: string,
  day: number,
): WeeklyPlanSlotRecord | null {
  const slots = getSlotsForPlan(db, planId);
  const slot = slots.find((s) => s.day === day);
  if (!slot || !slot.mealId) return null;

  const servedAt = new Date().toISOString();
  db.runSync(
    `UPDATE weekly_plan_slots SET served_at = ? WHERE plan_id = ? AND day = ?`,
    servedAt,
    planId,
    day,
  );

  // Also record in history
  db.runSync(
    `INSERT INTO meal_history (id, meal_id, served_on) VALUES (?, ?, ?)`,
    generateHistoryId(),
    slot.mealId,
    todayIsoDate(),
  );

  db.runSync(
    `UPDATE weekly_plans SET updated_at = datetime('now') WHERE id = ?`,
    planId,
  );

  return { ...slot, servedAt };
}

export function getPlannedMealIds(db: DatabaseHandle, planId: string): string[] {
  const rows = db.getAllSync<{ mealId: string }>(
    `SELECT DISTINCT meal_id AS mealId
     FROM weekly_plan_slots
     WHERE plan_id = ? AND meal_id IS NOT NULL`,
    planId,
  );
  return rows.map((r) => r.mealId);
}
