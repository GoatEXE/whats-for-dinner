import { generateHistoryId } from "../ids";
import { fromSqliteBoolean, todayIsoDate } from "../repo-helpers";
import type {
  DatabaseHandle,
  HistoryRecord,
  HistoryWriteInput,
} from "../types";

interface HistoryRow {
  id: string;
  mealId: string;
  mealName: string;
  servedOn: string;
  createdAt: string;
  isFavorite: number;
}

function mapHistoryRow(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    mealId: row.mealId,
    mealName: row.mealName,
    servedOn: row.servedOn,
    createdAt: row.createdAt,
    isFavorite: fromSqliteBoolean(row.isFavorite),
  };
}

function getById(database: DatabaseHandle, id: string) {
  const row = database.getFirstSync<HistoryRow>(
    `SELECT h.id,
            h.meal_id AS mealId,
            h.served_on AS servedOn,
            h.created_at AS createdAt,
            m.name AS mealName,
            m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     WHERE h.id = ?`,
    id,
  );

  return row ? mapHistoryRow(row) : null;
}

export function record(database: DatabaseHandle, input: HistoryWriteInput) {
  const id = input.id ?? generateHistoryId();
  const servedOn = input.servedOn ?? todayIsoDate();

  database.runSync(
    `INSERT INTO meal_history (id, meal_id, served_on)
     VALUES (?, ?, ?)`,
    id,
    input.mealId,
    servedOn,
  );

  return getById(database, id)!;
}

export function getRecent(database: DatabaseHandle, limit = 20) {
  const rows = database.getAllSync<HistoryRow>(
    `SELECT h.id,
            h.meal_id AS mealId,
            h.served_on AS servedOn,
            h.created_at AS createdAt,
            m.name AS mealName,
            m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     ORDER BY h.served_on DESC, h.created_at DESC
     LIMIT ?`,
    limit,
  );

  return rows.map(mapHistoryRow);
}

export function getByMeal(database: DatabaseHandle, mealId: string) {
  const rows = database.getAllSync<HistoryRow>(
    `SELECT h.id,
            h.meal_id AS mealId,
            h.served_on AS servedOn,
            h.created_at AS createdAt,
            m.name AS mealName,
            m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     WHERE h.meal_id = ?
     ORDER BY h.served_on DESC, h.created_at DESC`,
    mealId,
  );

  return rows.map(mapHistoryRow);
}

export function getAll(database: DatabaseHandle, limit?: number) {
  if (typeof limit === "number") {
    return getRecent(database, limit);
  }

  const rows = database.getAllSync<HistoryRow>(
    `SELECT h.id,
            h.meal_id AS mealId,
            h.served_on AS servedOn,
            h.created_at AS createdAt,
            m.name AS mealName,
            m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     ORDER BY h.served_on DESC, h.created_at DESC`,
  );

  return rows.map(mapHistoryRow);
}
