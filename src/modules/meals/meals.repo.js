const { normalizeName, normalizeTag } = require("../../lib/normalize");

function createMealsRepo(db, catalogRepo) {
  const getMealByIdStatement = db.prepare("SELECT id FROM meals WHERE id = ?");
  const insertMealStatement = db.prepare(
    `INSERT INTO meals (name, normalized_name, notes, prep_minutes, is_favorite, is_archived)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const updateMealStatement = db.prepare(
    `UPDATE meals
     SET name = ?, normalized_name = ?, notes = ?, prep_minutes = ?, is_favorite = ?, is_archived = ?
     WHERE id = ?`,
  );
  const deleteMealIngredientsStatement = db.prepare(
    "DELETE FROM meal_ingredients WHERE meal_id = ?",
  );
  const deleteMealTagsStatement = db.prepare(
    "DELETE FROM meal_tags WHERE meal_id = ?",
  );
  const insertMealIngredientStatement = db.prepare(
    `INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity_text, is_optional, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertMealTagStatement = db.prepare(
    "INSERT INTO meal_tags (meal_id, tag_id) VALUES (?, ?)",
  );
  const setFavoriteStatement = db.prepare(
    "UPDATE meals SET is_favorite = ? WHERE id = ?",
  );
  const archiveMealStatement = db.prepare(
    "UPDATE meals SET is_archived = 1 WHERE id = ?",
  );
  const findMealByNormalizedNameStatement = db.prepare(
    "SELECT id, name FROM meals WHERE normalized_name = ?",
  );

  function buildMeals(baseRows) {
    if (baseRows.length === 0) {
      return [];
    }

    const mealIds = baseRows.map((row) => row.id);
    const placeholders = mealIds.map(() => "?").join(", ");
    const ingredientRows = db
      .prepare(
        `SELECT mi.meal_id AS mealId, mi.quantity_text AS quantityText, mi.is_optional AS isOptional, mi.sort_order AS sortOrder,
                i.id AS ingredientId, i.name
         FROM meal_ingredients mi
         INNER JOIN ingredients i ON i.id = mi.ingredient_id
         WHERE mi.meal_id IN (${placeholders})
         ORDER BY mi.meal_id, mi.sort_order, i.name COLLATE NOCASE`,
      )
      .all(...mealIds);
    const tagRows = db
      .prepare(
        `SELECT mt.meal_id AS mealId, t.id AS tagId, t.name
         FROM meal_tags mt
         INNER JOIN tags t ON t.id = mt.tag_id
         WHERE mt.meal_id IN (${placeholders})
         ORDER BY mt.meal_id, t.name COLLATE NOCASE`,
      )
      .all(...mealIds);

    const ingredientMap = new Map();
    const tagMap = new Map();

    for (const row of ingredientRows) {
      const ingredients = ingredientMap.get(row.mealId) ?? [];
      ingredients.push({
        ingredientId: row.ingredientId,
        name: row.name,
        quantityText: row.quantityText,
        isOptional: Boolean(row.isOptional),
        sortOrder: row.sortOrder,
      });
      ingredientMap.set(row.mealId, ingredients);
    }

    for (const row of tagRows) {
      const tags = tagMap.get(row.mealId) ?? [];
      tags.push({ tagId: row.tagId, name: row.name });
      tagMap.set(row.mealId, tags);
    }

    return baseRows.map((row) => ({
      id: row.id,
      name: row.name,
      normalizedName: row.normalizedName,
      notes: row.notes,
      prepMinutes: row.prepMinutes,
      isFavorite: Boolean(row.isFavorite),
      isArchived: Boolean(row.isArchived),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ingredients: ingredientMap.get(row.id) ?? [],
      tags: (tagMap.get(row.id) ?? []).map((tag) => tag.name),
    }));
  }

  function getMealsByIds(ids) {
    if (ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => "?").join(", ");
    const baseRows = db
      .prepare(
        `SELECT id, name, normalized_name AS normalizedName, notes, prep_minutes AS prepMinutes,
                is_favorite AS isFavorite, is_archived AS isArchived, created_at AS createdAt, updated_at AS updatedAt
         FROM meals
         WHERE id IN (${placeholders})`,
      )
      .all(...ids);

    const positionMap = new Map(ids.map((id, index) => [id, index]));
    return buildMeals(baseRows).sort(
      (left, right) => positionMap.get(left.id) - positionMap.get(right.id),
    );
  }

  function listMeals(filters = {}) {
    const where = [];
    const params = [];

    if (filters.archived === undefined) {
      where.push("m.is_archived = 0");
    } else {
      where.push("m.is_archived = ?");
      params.push(filters.archived ? 1 : 0);
    }

    if (filters.favorite !== undefined) {
      where.push("m.is_favorite = ?");
      params.push(filters.favorite ? 1 : 0);
    }

    if (filters.q) {
      where.push(
        "(LOWER(m.name) LIKE ? OR LOWER(COALESCE(m.notes, '')) LIKE ?)",
      );
      const query = `%${String(filters.q).toLowerCase()}%`;
      params.push(query, query);
    }

    if (filters.tag) {
      where.push(
        `EXISTS (
           SELECT 1
           FROM meal_tags mt
           INNER JOIN tags t ON t.id = mt.tag_id
           WHERE mt.meal_id = m.id AND t.normalized_name = ?
         )`,
      );
      params.push(normalizeTag(filters.tag));
    }

    const sql = `
      SELECT m.id
      FROM meals m
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY m.is_favorite DESC, m.name COLLATE NOCASE
    `;

    const ids = db
      .prepare(sql)
      .all(...params)
      .map((row) => row.id);

    return getMealsByIds(ids);
  }

  function getMealById(id) {
    return getMealsByIds([id])[0] ?? null;
  }

  function findByNormalizedName(normalizedName) {
    return findMealByNormalizedNameStatement.get(normalizedName) ?? null;
  }

  function replaceMealRelationships(mealId, ingredients, tags) {
    deleteMealIngredientsStatement.run(mealId);
    deleteMealTagsStatement.run(mealId);

    const ingredientRecords = catalogRepo.ensureIngredients(ingredients);
    ingredientRecords.forEach((ingredientRecord, index) => {
      const ingredient = ingredients[index];
      insertMealIngredientStatement.run(
        mealId,
        ingredientRecord.id,
        ingredient.quantityText ?? null,
        ingredient.isOptional ? 1 : 0,
        index,
      );
    });

    const dedupedTags = [
      ...new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean)),
    ];
    const tagRecords = catalogRepo.ensureTags(dedupedTags);
    tagRecords.forEach((tagRecord) => {
      insertMealTagStatement.run(mealId, tagRecord.id);
    });
  }

  const createMealTransaction = db.transaction((meal) => {
    const result = insertMealStatement.run(
      meal.name.trim(),
      normalizeName(meal.name),
      meal.notes ?? null,
      meal.prepMinutes ?? null,
      meal.isFavorite ? 1 : 0,
      meal.isArchived ? 1 : 0,
    );
    const mealId = Number(result.lastInsertRowid);

    replaceMealRelationships(mealId, meal.ingredients, meal.tags ?? []);
    return mealId;
  });

  const updateMealTransaction = db.transaction((mealId, meal) => {
    updateMealStatement.run(
      meal.name.trim(),
      normalizeName(meal.name),
      meal.notes ?? null,
      meal.prepMinutes ?? null,
      meal.isFavorite ? 1 : 0,
      meal.isArchived ? 1 : 0,
      mealId,
    );

    replaceMealRelationships(mealId, meal.ingredients, meal.tags ?? []);
  });

  function createMeal(meal) {
    const mealId = createMealTransaction(meal);
    return getMealById(mealId);
  }

  function updateMeal(mealId, meal) {
    updateMealTransaction(mealId, meal);
    return getMealById(mealId);
  }

  function setFavorite(mealId, isFavorite) {
    setFavoriteStatement.run(isFavorite ? 1 : 0, mealId);
    return getMealById(mealId);
  }

  function archiveMeal(mealId) {
    archiveMealStatement.run(mealId);
    return getMealById(mealId);
  }

  function exists(mealId) {
    return Boolean(getMealByIdStatement.get(mealId));
  }

  return {
    listMeals,
    getMealById,
    findByNormalizedName,
    createMeal,
    updateMeal,
    setFavorite,
    archiveMeal,
    exists,
  };
}

module.exports = {
  createMealsRepo,
};
