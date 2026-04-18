import { normalizeName } from '@whats-for-dinner/domain';

import { generateIngredientId } from "../ids";
import type { DatabaseHandle, IngredientRecord } from "../types";

interface IngredientRow {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function mapIngredient(row: IngredientRow): IngredientRecord {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function getById(database: DatabaseHandle, id: string) {
  const row = database.getFirstSync<IngredientRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM ingredients
     WHERE id = ?`,
    id,
  );

  return row ? mapIngredient(row) : null;
}

export function getOrCreate(database: DatabaseHandle, name: string) {
  const trimmedName = String(name).trim();
  const normalizedName = normalizeName(trimmedName);
  const ingredientId = generateIngredientId(normalizedName);
  const existing = database.getFirstSync<IngredientRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM ingredients
     WHERE id = ? OR normalized_name = ?`,
    ingredientId,
    normalizedName,
  );

  if (existing) {
    if (existing.name !== trimmedName || existing.deletedAt !== null) {
      database.runSync(
        `UPDATE ingredients
         SET name = ?,
             deleted_at = NULL
         WHERE id = ?`,
        trimmedName,
        existing.id,
      );
    }

    return getById(database, existing.id)!;
  }

  database.runSync(
    `INSERT INTO ingredients (id, name, normalized_name)
     VALUES (?, ?, ?)`,
    ingredientId,
    trimmedName,
    normalizedName,
  );

  return getById(database, ingredientId)!;
}

export function getAll(database: DatabaseHandle, options: { includeDeleted?: boolean } = {}) {
  const rows = database.getAllSync<IngredientRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM ingredients
     ${options.includeDeleted ? "" : "WHERE deleted_at IS NULL"}
     ORDER BY name COLLATE NOCASE`,
  );

  return rows.map(mapIngredient);
}

export function search(database: DatabaseHandle, query: string) {
  const likeQuery = `%${query.trim().toLowerCase()}%`;
  const rows = database.getAllSync<IngredientRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM ingredients
     WHERE deleted_at IS NULL
       AND (LOWER(name) LIKE ? OR normalized_name LIKE ?)
     ORDER BY name COLLATE NOCASE`,
    likeQuery,
    likeQuery,
  );

  return rows.map(mapIngredient);
}
