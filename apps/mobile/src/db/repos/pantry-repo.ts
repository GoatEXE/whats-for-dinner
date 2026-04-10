import * as ingredientsRepo from "./ingredients-repo";

import type {
  DatabaseHandle,
  PantryItemInput,
  PantryItemRecord,
} from "../types";

interface PantryRow {
  ingredientId: string;
  name: string;
  normalizedName: string;
  addedAt: string;
}

function mapPantryRow(row: PantryRow): PantryItemRecord {
  return {
    ingredientId: row.ingredientId,
    name: row.name,
    normalizedName: row.normalizedName,
    addedAt: row.addedAt,
  };
}

function resolveIngredientId(database: DatabaseHandle, input: PantryItemInput) {
  if (input.ingredientId) {
    return input.ingredientId;
  }

  if (input.name) {
    return ingredientsRepo.getOrCreate(database, input.name).id;
  }

  throw new Error("Pantry item requires ingredientId or name");
}

export function getAll(database: DatabaseHandle) {
  const rows = database.getAllSync<PantryRow>(
    `SELECT p.ingredient_id AS ingredientId,
            i.name,
            i.normalized_name AS normalizedName,
            p.added_at AS addedAt
     FROM pantry_items p
     INNER JOIN ingredients i ON i.id = p.ingredient_id
     WHERE i.deleted_at IS NULL
     ORDER BY i.name COLLATE NOCASE`,
  );

  return rows.map(mapPantryRow);
}

export function addItem(database: DatabaseHandle, input: PantryItemInput) {
  const ingredientId = resolveIngredientId(database, input);

  database.runSync(
    `INSERT INTO pantry_items (ingredient_id)
     VALUES (?)
     ON CONFLICT(ingredient_id) DO NOTHING`,
    ingredientId,
  );

  return getAll(database);
}

export function removeItem(database: DatabaseHandle, ingredientId: string) {
  database.runSync("DELETE FROM pantry_items WHERE ingredient_id = ?", ingredientId);
  return getAll(database);
}

export function isOnHand(database: DatabaseHandle, ingredientId: string) {
  const row = database.getFirstSync<{ ingredientId: string }>(
    `SELECT ingredient_id AS ingredientId
     FROM pantry_items
     WHERE ingredient_id = ?`,
    ingredientId,
  );

  return Boolean(row);
}

export function bulkSet(database: DatabaseHandle, items: PantryItemInput[]) {
  database.withTransactionSync(() => {
    database.runSync("DELETE FROM pantry_items");

    const ingredientIds = new Set<string>();

    items.forEach((item) => {
      ingredientIds.add(resolveIngredientId(database, item));
    });

    ingredientIds.forEach((ingredientId) => {
      database.runSync(
        `INSERT INTO pantry_items (ingredient_id)
         VALUES (?)
         ON CONFLICT(ingredient_id) DO NOTHING`,
        ingredientId,
      );
    });
  });

  return getAll(database);
}
