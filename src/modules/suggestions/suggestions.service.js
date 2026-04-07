const { HttpError } = require("../../lib/errors");

function sortMatches(a, b) {
  if (a.isFullMatch !== b.isFullMatch) {
    return a.isFullMatch ? -1 : 1;
  }

  if (a.matchPercentage !== b.matchPercentage) {
    return b.matchPercentage - a.matchPercentage;
  }

  if (
    a.missingRequiredIngredients.length !== b.missingRequiredIngredients.length
  ) {
    return (
      a.missingRequiredIngredients.length - b.missingRequiredIngredients.length
    );
  }

  if (a.isFavorite !== b.isFavorite) {
    return a.isFavorite ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

function createSuggestionsService(suggestionsRepo, catalogRepo) {
  function resolveAvailableIngredients(input) {
    const available = [];

    if (input.useSavedPantry) {
      available.push(
        ...suggestionsRepo.listSavedPantryItems().map((item) => ({
          ingredientId: item.ingredientId,
          name: item.name,
        })),
      );
    }

    if (input.ingredientIds && input.ingredientIds.length > 0) {
      const resolved = catalogRepo.resolveIngredientsByIds(input.ingredientIds);

      if (resolved.length !== input.ingredientIds.length) {
        throw new HttpError(404, "One or more ingredient IDs were not found");
      }

      available.push(
        ...resolved.map((item) => ({ ingredientId: item.id, name: item.name })),
      );
    }

    if (input.ingredientNames && input.ingredientNames.length > 0) {
      const resolved = catalogRepo.ensureIngredients(
        input.ingredientNames.map((name) => ({ name })),
      );
      available.push(
        ...resolved.map((item) => ({ ingredientId: item.id, name: item.name })),
      );
    }

    const deduped = new Map();
    available.forEach((item) => deduped.set(item.ingredientId, item));
    return [...deduped.values()];
  }

  function buildMatch(meal, availableMap) {
    const requiredIngredients = meal.ingredients.filter(
      (ingredient) => !ingredient.isOptional,
    );
    const optionalIngredients = meal.ingredients.filter(
      (ingredient) => ingredient.isOptional,
    );
    const matchedRequiredIngredients = requiredIngredients.filter(
      (ingredient) => availableMap.has(ingredient.ingredientId),
    );
    const missingRequiredIngredients = requiredIngredients.filter(
      (ingredient) => !availableMap.has(ingredient.ingredientId),
    );
    const matchedOptionalIngredients = optionalIngredients.filter(
      (ingredient) => availableMap.has(ingredient.ingredientId),
    );
    const missingOptionalIngredients = optionalIngredients.filter(
      (ingredient) => !availableMap.has(ingredient.ingredientId),
    );
    const matchPercentage =
      requiredIngredients.length === 0
        ? 1
        : matchedRequiredIngredients.length / requiredIngredients.length;

    return {
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      prepMinutes: meal.prepMinutes,
      isFavorite: meal.isFavorite,
      tags: meal.tags,
      requiredIngredientCount: requiredIngredients.length,
      matchedRequiredCount: matchedRequiredIngredients.length,
      missingRequiredIngredients,
      matchedOptionalIngredients,
      missingOptionalIngredients,
      isFullMatch: missingRequiredIngredients.length === 0,
      matchPercentage,
      shoppingNeededCount: missingRequiredIngredients.length,
    };
  }

  function findMatches(input) {
    const availableIngredients = resolveAvailableIngredients(input);
    const availableMap = new Map(
      availableIngredients.map((ingredient) => [
        ingredient.ingredientId,
        ingredient,
      ]),
    );
    const matches = suggestionsRepo
      .listCandidateMeals({ favoritesOnly: input.favoritesOnly })
      .map((meal) => buildMatch(meal, availableMap))
      .filter((match) => input.includePartial || match.isFullMatch)
      .sort(sortMatches);

    return {
      availableIngredients,
      matches,
    };
  }

  function pickRandomMeal(filters) {
    const recentMealIds = new Set(
      suggestionsRepo.listRecentlyServedMealIds(
        filters.excludeServedWithinDays,
      ),
    );
    const excludedMealIds = new Set(filters.excludeMealIds ?? []);
    let candidates = suggestionsRepo
      .listCandidateMeals({ favoritesOnly: filters.favoritesOnly })
      .filter((meal) => !recentMealIds.has(meal.id))
      .filter((meal) => !excludedMealIds.has(meal.id));

    if (filters.fullMatchOnly) {
      const matches = findMatches({
        useSavedPantry: true,
        favoritesOnly: filters.favoritesOnly,
        includePartial: false,
      }).matches;
      const fullMatchIds = new Set(matches.map((match) => match.id));
      candidates = candidates.filter((meal) => fullMatchIds.has(meal.id));
    }

    if (candidates.length === 0) {
      throw new HttpError(404, "No meals matched the random selection filters");
    }

    const selectedMeal =
      candidates[Math.floor(Math.random() * candidates.length)];

    return {
      meal: selectedMeal,
      candidateCount: candidates.length,
      filtersApplied: filters,
    };
  }

  return {
    findMatches,
    pickRandomMeal,
  };
}

module.exports = {
  createSuggestionsService,
  sortMatches,
};
