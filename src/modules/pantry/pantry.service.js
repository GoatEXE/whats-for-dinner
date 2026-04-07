const { HttpError } = require("../../lib/errors");

function dedupePantryItems(items) {
  const map = new Map();

  for (const item of items) {
    map.set(item.ingredientId, item);
  }

  return [...map.values()];
}

function createPantryService(pantryRepo, catalogRepo) {
  function listPantryItems() {
    return pantryRepo.listPantryItems();
  }

  function resolveInputs(items) {
    const idInputs = items.filter((item) => item.ingredientId);

    if (idInputs.length > 0) {
      const resolved = catalogRepo.resolveIngredientsByIds(
        idInputs.map((item) => item.ingredientId),
      );

      if (resolved.length !== idInputs.length) {
        throw new HttpError(
          404,
          "One or more pantry ingredient IDs were not found",
        );
      }
    }

    return dedupePantryItems(pantryRepo.resolvePantryInputs(items));
  }

  function replacePantryItems(items) {
    return pantryRepo.replacePantryItems(resolveInputs(items));
  }

  function addPantryItem(item) {
    return pantryRepo.addPantryItem(resolveInputs([item])[0]);
  }

  function removePantryItem(ingredientId) {
    return pantryRepo.removePantryItem(ingredientId);
  }

  return {
    listPantryItems,
    replacePantryItems,
    addPantryItem,
    removePantryItem,
  };
}

module.exports = {
  createPantryService,
};
