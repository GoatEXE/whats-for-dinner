import { normalizeTag } from '@whats-for-dinner/domain';

import { generateTagId } from "../ids";
import type { DatabaseHandle, TagRecord } from "../types";

interface TagRow {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function mapTag(row: TagRow): TagRecord {
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
  const row = database.getFirstSync<TagRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM tags
     WHERE id = ?`,
    id,
  );

  return row ? mapTag(row) : null;
}

export function getOrCreate(database: DatabaseHandle, name: string) {
  const trimmedName = String(name).trim();
  const normalizedName = normalizeTag(trimmedName);
  const tagId = generateTagId(normalizedName);
  const existing = database.getFirstSync<TagRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM tags
     WHERE id = ? OR normalized_name = ?`,
    tagId,
    normalizedName,
  );

  if (existing) {
    if (existing.name !== trimmedName || existing.deletedAt !== null) {
      database.runSync(
        `UPDATE tags
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
    `INSERT INTO tags (id, name, normalized_name)
     VALUES (?, ?, ?)`,
    tagId,
    trimmedName,
    normalizedName,
  );

  return getById(database, tagId)!;
}

export function getAll(database: DatabaseHandle, options: { includeDeleted?: boolean } = {}) {
  const rows = database.getAllSync<TagRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM tags
     ${options.includeDeleted ? "" : "WHERE deleted_at IS NULL"}
     ORDER BY name COLLATE NOCASE`,
  );

  return rows.map(mapTag);
}
