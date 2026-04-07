function createPantryRepo(db, catalogRepo) {
  const pantryListStatement = db.prepare(
    `SELECT p.ingredient_id AS ingredientId, i.name, i.normalized_name AS normalizedName, p.quantity_text AS quantityText, p.updated_at AS updatedAt
     FROM pantry_items p
     INNER JOIN ingredients i ON i.id = p.ingredient_id
     ORDER BY i.name COLLATE NOCASE`,
  );
  const upsertPantryStatement = db.prepare(
    `INSERT INTO pantry_items (ingredient_id, quantity_text, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(ingredient_id)
     DO UPDATE SET quantity_text = excluded.quantity_text, updated_at = CURRENT_TIMESTAMP`,
  );
  const clearPantryStatement = db.prepare("DELETE FROM pantry_items");
  const deletePantryItemStatement = db.prepare(
    "DELETE FROM pantry_items WHERE ingredient_id = ?",
  );

  function listPantryItems() {
    return pantryListStatement.all();
  }

  function replacePantryItems(items) {
    const transaction = db.transaction(() => {
      clearPantryStatement.run();

      for (const item of items) {
        upsertPantryStatement.run(item.ingredientId, item.quantityText ?? null);
      }
    });

    transaction();
    return listPantryItems();
  }

  function addPantryItem(item) {
    upsertPantryStatement.run(item.ingredientId, item.quantityText ?? null);
    return listPantryItems();
  }

  function removePantryItem(ingredientId) {
    deletePantryItemStatement.run(ingredientId);
    return listPantryItems();
  }

  function listPantryIngredientIds() {
    return listPantryItems().map((item) => item.ingredientId);
  }

  function resolvePantryInputs(items) {
    const namedItems = items.filter((item) => item.name);
    const idItems = items.filter((item) => item.ingredientId);
    const resolvedByName = catalogRepo.ensureIngredients(namedItems);
    const resolvedById = catalogRepo.resolveIngredientsByIds(
      idItems.map((item) => item.ingredientId),
    );

    return [
      ...resolvedByName.map((ingredient, index) => ({
        ingredientId: ingredient.id,
        quantityText: namedItems[index].quantityText ?? null,
      })),
      ...resolvedById.map((ingredient, index) => ({
        ingredientId: ingredient.id,
        quantityText: idItems[index].quantityText ?? null,
      })),
    ];
  }

  return {
    listPantryItems,
    replacePantryItems,
    addPantryItem,
    removePantryItem,
    listPantryIngredientIds,
    resolvePantryInputs,
  };
}

module.exports = {
  createPantryRepo,
};
