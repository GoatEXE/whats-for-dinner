const { HttpError } = require("./errors");

function toAvailableIngredient(item) {
  return {
    ingredientId: item.ingredientId ?? item.id,
    name: item.name,
  };
}

function resolveAvailableIngredients(input, options) {
  const availableIngredients = [];

  if (input.useSavedPantry) {
    availableIngredients.push(
      ...options.pantryLookup().map(toAvailableIngredient),
    );
  }

  if (input.ingredientIds && input.ingredientIds.length > 0) {
    const resolved = options.catalogRepo.resolveIngredientsByIds(
      input.ingredientIds,
    );

    if (resolved.length !== input.ingredientIds.length) {
      throw new HttpError(404, "One or more ingredient IDs were not found");
    }

    availableIngredients.push(...resolved.map(toAvailableIngredient));
  }

  if (input.ingredientNames && input.ingredientNames.length > 0) {
    const resolved = options.nameResolver(input.ingredientNames);
    availableIngredients.push(...resolved.map(toAvailableIngredient));
  }

  const dedupedIngredients = new Map();

  availableIngredients.forEach((ingredient) => {
    dedupedIngredients.set(ingredient.ingredientId, ingredient);
  });

  const resolvedIngredients = [...dedupedIngredients.values()];

  if (options.sortComparator) {
    resolvedIngredients.sort(options.sortComparator);
  }

  return resolvedIngredients;
}

module.exports = {
  resolveAvailableIngredients,
};
