function createSuggestionsRepo(mealsRepo, pantryRepo, historyRepo) {
  function listCandidateMeals(filters = {}) {
    return mealsRepo.listMeals({
      archived: false,
      favorite: filters.favoritesOnly ? true : undefined,
    });
  }

  function listSavedPantryItems() {
    return pantryRepo.listPantryItems();
  }

  function listRecentlyServedMealIds(days) {
    return historyRepo.listRecentlyServedMealIds(days);
  }

  return {
    listCandidateMeals,
    listSavedPantryItems,
    listRecentlyServedMealIds,
  };
}

module.exports = {
  createSuggestionsRepo,
};
