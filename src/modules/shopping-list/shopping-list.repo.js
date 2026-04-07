function createShoppingListRepo(mealsRepo, pantryRepo) {
  function getSelectedMeals(mealIds) {
    return mealIds
      .map((mealId) => mealsRepo.getMealById(mealId))
      .filter(Boolean);
  }

  function listPantryItems() {
    return pantryRepo.listPantryItems();
  }

  return {
    getSelectedMeals,
    listPantryItems,
  };
}

module.exports = {
  createShoppingListRepo,
};
