import { normalizeName, normalizeTag } from '@whats-for-dinner/domain';

import { generateMealId } from "../ids";
import {
  buildPlaceholders,
  escapeLikePattern,
  fromSqliteBoolean,
  toSqliteBoolean,
} from "../repo-helpers";
import type {
  DatabaseHandle,
  MealIngredientInput,
  MealListFilters,
  MealRecord,
  MealUpdateInput,
  MealWriteInput,
} from "../types";
import * as ingredientsRepo from "./ingredients-repo";
import * as tagsRepo from "./tags-repo";

interface MealBaseRow {
  id: string;
  name: string;
  normalizedName: string;
  notes: string | null;
  prepMinutes: number | null;
  isFavorite: number;
  isArchived: number;
  sourceUrl: string | null;
  sourceHost: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MealIngredientRow {
  mealId: string;
  ingredientId: string;
  name: string;
  normalizedName: string;
  quantityText: string | null;
  isOptional: number;
  sortOrder: number;
}

interface MealTagRow {
  mealId: string;
  name: string;
}

function mapMealBaseRow(row: MealBaseRow) {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    notes: row.notes,
    prepMinutes: row.prepMinutes,
    isFavorite: fromSqliteBoolean(row.isFavorite),
    isArchived: fromSqliteBoolean(row.isArchived),
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function buildMeals(database: DatabaseHandle, baseRows: MealBaseRow[]): MealRecord[] {
  if (baseRows.length === 0) {
    return [];
  }

  const mealIds = baseRows.map((row) => row.id);
  const placeholders = buildPlaceholders(mealIds.length);
  const ingredientRows = database.getAllSync<MealIngredientRow>(
    `SELECT mi.meal_id AS mealId,
            mi.ingredient_id AS ingredientId,
            i.name,
            i.normalized_name AS normalizedName,
            mi.quantity_text AS quantityText,
            mi.is_optional AS isOptional,
            mi.sort_order AS sortOrder
     FROM meal_ingredients mi
     INNER JOIN ingredients i ON i.id = mi.ingredient_id
     WHERE mi.meal_id IN (${placeholders})
       AND i.deleted_at IS NULL
     ORDER BY mi.meal_id, mi.sort_order, i.name COLLATE NOCASE`,
    mealIds,
  );
  const tagRows = database.getAllSync<MealTagRow>(
    `SELECT mt.meal_id AS mealId,
            t.name
     FROM meal_tags mt
     INNER JOIN tags t ON t.id = mt.tag_id
     WHERE mt.meal_id IN (${placeholders})
       AND t.deleted_at IS NULL
     ORDER BY mt.meal_id, t.name COLLATE NOCASE`,
    mealIds,
  );
  const ingredientMap = new Map<string, MealRecord["ingredients"]>();
  const tagMap = new Map<string, string[]>();

  ingredientRows.forEach((row) => {
    const ingredients = ingredientMap.get(row.mealId) ?? [];

    ingredients.push({
      ingredientId: row.ingredientId,
      name: row.name,
      normalizedName: row.normalizedName,
      quantityText: row.quantityText,
      isOptional: fromSqliteBoolean(row.isOptional),
      sortOrder: row.sortOrder,
    });
    ingredientMap.set(row.mealId, ingredients);
  });

  tagRows.forEach((row) => {
    const tags = tagMap.get(row.mealId) ?? [];

    tags.push(row.name);
    tagMap.set(row.mealId, tags);
  });

  return baseRows.map((row) => ({
    ...mapMealBaseRow(row),
    ingredients: ingredientMap.get(row.id) ?? [],
    tags: tagMap.get(row.id) ?? [],
  }));
}

function getMealsByIds(
  database: DatabaseHandle,
  ids: string[],
  options: { includeDeleted?: boolean } = {},
) {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = buildPlaceholders(ids.length);
  const params: string[] = [...ids];
  const where = [`id IN (${placeholders})`];

  if (!options.includeDeleted) {
    where.push("deleted_at IS NULL");
  }

  const rows = database.getAllSync<MealBaseRow>(
    `SELECT id,
            name,
            normalized_name AS normalizedName,
            notes,
            prep_minutes AS prepMinutes,
            is_favorite AS isFavorite,
            is_archived AS isArchived,
            source_url AS sourceUrl,
            source_host AS sourceHost,
            image_url AS imageUrl,
            created_at AS createdAt,
            updated_at AS updatedAt,
            deleted_at AS deletedAt
     FROM meals
     WHERE ${where.join(" AND ")}`,
    params,
  );
  const positionMap = new Map(ids.map((id, index) => [id, index]));

  return buildMeals(database, rows).sort(
    (left, right) => (positionMap.get(left.id) ?? 0) - (positionMap.get(right.id) ?? 0),
  );
}

function replaceRelationships(
  database: DatabaseHandle,
  mealId: string,
  ingredients: MealIngredientInput[],
  tags: string[],
) {
  database.runSync("DELETE FROM meal_ingredients WHERE meal_id = ?", mealId);
  database.runSync("DELETE FROM meal_tags WHERE meal_id = ?", mealId);

  ingredients.forEach((ingredient, index) => {
    const ingredientRecord = ingredientsRepo.getOrCreate(database, ingredient.name);

    database.runSync(
      `INSERT INTO meal_ingredients (
         meal_id,
         ingredient_id,
         quantity_text,
         is_optional,
         sort_order
       )
       VALUES (?, ?, ?, ?, ?)`,
      mealId,
      ingredientRecord.id,
      ingredient.quantityText ?? null,
      toSqliteBoolean(Boolean(ingredient.isOptional)),
      index,
    );
  });

  const seenTags = new Set<string>();

  tags.forEach((tagName) => {
    const normalizedTag = normalizeTag(tagName);

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      return;
    }

    seenTags.add(normalizedTag);

    const tagRecord = tagsRepo.getOrCreate(database, tagName);

    database.runSync(
      `INSERT INTO meal_tags (meal_id, tag_id)
       VALUES (?, ?)`,
      mealId,
      tagRecord.id,
    );
  });
}

export function getAll(database: DatabaseHandle, filters: MealListFilters = {}) {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (!filters.includeDeleted) {
    where.push("m.deleted_at IS NULL");
  }

  if (filters.archived === undefined) {
    where.push("m.is_archived = 0");
  } else {
    where.push("m.is_archived = ?");
    params.push(toSqliteBoolean(filters.archived));
  }

  if (filters.favorite !== undefined) {
    where.push("m.is_favorite = ?");
    params.push(toSqliteBoolean(filters.favorite));
  }

  if (filters.tag) {
    where.push(
      `EXISTS (
         SELECT 1
         FROM meal_tags mt
         INNER JOIN tags t ON t.id = mt.tag_id
         WHERE mt.meal_id = m.id
           AND t.deleted_at IS NULL
           AND t.normalized_name = ?
       )`,
    );
    params.push(normalizeTag(filters.tag));
  }

  if (filters.q) {
    const likeQuery = `%${escapeLikePattern(filters.q.trim().toLowerCase())}%`;

    where.push(
      `(
        LOWER(m.name) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(m.notes, '')) LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1
          FROM meal_tags mt
          INNER JOIN tags t ON t.id = mt.tag_id
          WHERE mt.meal_id = m.id
            AND t.deleted_at IS NULL
            AND LOWER(t.name) LIKE ? ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1
          FROM meal_ingredients mi
          INNER JOIN ingredients i ON i.id = mi.ingredient_id
          WHERE mi.meal_id = m.id
            AND i.deleted_at IS NULL
            AND LOWER(i.name) LIKE ? ESCAPE '\\'
        )
      )`,
    );
    params.push(likeQuery, likeQuery, likeQuery, likeQuery);
  }

  const rows = database.getAllSync<{ id: string }>(
    `SELECT m.id
     FROM meals m
     ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY m.is_favorite DESC, m.name COLLATE NOCASE`,
    params,
  );

  return getMealsByIds(database, rows.map((row) => row.id), {
    includeDeleted: filters.includeDeleted,
  });
}

export function search(
  database: DatabaseHandle,
  query: string,
  filters: Omit<MealListFilters, "q"> = {},
) {
  return getAll(database, {
    ...filters,
    q: query,
  });
}

export function getById(
  database: DatabaseHandle,
  id: string,
  options: { includeDeleted?: boolean } = {},
) {
  return getMealsByIds(database, [id], options)[0] ?? null;
}

export function create(database: DatabaseHandle, input: MealWriteInput) {
  const mealId = input.id ?? generateMealId();

  database.withTransactionSync(() => {
    database.runSync(
      `INSERT INTO meals (
         id,
         name,
         normalized_name,
         notes,
         prep_minutes,
         is_favorite,
         is_archived,
         source_url,
         source_host,
         image_url,
         deleted_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      mealId,
      input.name.trim(),
      normalizeName(input.name),
      input.notes ?? null,
      input.prepMinutes ?? null,
      toSqliteBoolean(input.isFavorite),
      toSqliteBoolean(input.isArchived),
      input.sourceUrl ?? null,
      input.sourceHost ?? null,
      input.imageUrl ?? null,
    );

    replaceRelationships(database, mealId, input.ingredients, input.tags ?? []);
  });

  return getById(database, mealId)!;
}

export function update(database: DatabaseHandle, id: string, input: MealUpdateInput) {
  const existing = getById(database, id, { includeDeleted: true });

  if (!existing) {
    return null;
  }

  const nextIngredients =
    input.ingredients ??
    existing.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantityText: ingredient.quantityText,
      isOptional: ingredient.isOptional,
    }));
  const nextTags = input.tags ?? existing.tags;
  const nextName = input.name ?? existing.name;

  database.withTransactionSync(() => {
    database.runSync(
      `UPDATE meals
       SET name = ?,
           normalized_name = ?,
           notes = ?,
           prep_minutes = ?,
           is_favorite = ?,
           is_archived = ?,
           source_url = ?,
           source_host = ?,
           image_url = ?,
           deleted_at = ?
       WHERE id = ?`,
      nextName.trim(),
      normalizeName(nextName),
      input.notes === undefined ? existing.notes : input.notes,
      input.prepMinutes === undefined ? existing.prepMinutes : input.prepMinutes,
      toSqliteBoolean(input.isFavorite ?? existing.isFavorite),
      toSqliteBoolean(input.isArchived ?? existing.isArchived),
      input.sourceUrl === undefined ? existing.sourceUrl : input.sourceUrl,
      input.sourceHost === undefined ? existing.sourceHost : input.sourceHost,
      input.imageUrl === undefined ? existing.imageUrl : input.imageUrl,
      existing.deletedAt,
      id,
    );

    replaceRelationships(database, id, nextIngredients, nextTags);
  });

  return getById(database, id, { includeDeleted: true });
}

export function archive(database: DatabaseHandle, id: string, archived = true) {
  database.runSync(
    `UPDATE meals
     SET is_archived = ?
     WHERE id = ?`,
    toSqliteBoolean(archived),
    id,
  );

  return getById(database, id, { includeDeleted: true });
}

export function toggleFavorite(
  database: DatabaseHandle,
  id: string,
  nextValue?: boolean,
) {
  const existing = getById(database, id, { includeDeleted: true });

  if (!existing) {
    return null;
  }

  database.runSync(
    `UPDATE meals
     SET is_favorite = ?
     WHERE id = ?`,
    toSqliteBoolean(nextValue ?? !existing.isFavorite),
    id,
  );

  return getById(database, id, { includeDeleted: true });
}

export function remove(database: DatabaseHandle, id: string) {
  database.runSync(
    `UPDATE meals
     SET is_archived = 1,
         deleted_at = datetime('now')
     WHERE id = ?`,
    id,
  );

  return getById(database, id, { includeDeleted: true });
}

export { remove as delete };
