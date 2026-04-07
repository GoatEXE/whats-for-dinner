const Database = require("better-sqlite3");
const { HttpError } = require("../../lib/errors");

function createMealsService(mealsRepo) {
  function listMeals(filters) {
    return mealsRepo.listMeals(filters);
  }

  function getMealById(id) {
    const meal = mealsRepo.getMealById(id);

    if (!meal) {
      throw new HttpError(404, "Meal not found");
    }

    return meal;
  }

  function createMeal(payload) {
    try {
      return mealsRepo.createMeal({
        ...payload,
        tags: payload.tags ?? [],
      });
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new HttpError(409, "A meal with that name already exists");
      }

      throw error;
    }
  }

  function updateMeal(id, payload) {
    const existing = getMealById(id);
    const merged = {
      ...existing,
      ...payload,
      tags: payload.tags ?? existing.tags,
      ingredients:
        payload.ingredients ??
        existing.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantityText: ingredient.quantityText,
          isOptional: ingredient.isOptional,
        })),
    };

    try {
      return mealsRepo.updateMeal(id, merged);
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new HttpError(409, "A meal with that name already exists");
      }

      throw error;
    }
  }

  function toggleFavorite(id, isFavorite) {
    const existing = getMealById(id);
    const nextValue =
      typeof isFavorite === "boolean" ? isFavorite : !existing.isFavorite;
    return mealsRepo.setFavorite(id, nextValue);
  }

  function archiveMeal(id) {
    getMealById(id);
    return mealsRepo.archiveMeal(id);
  }

  return {
    listMeals,
    getMealById,
    createMeal,
    updateMeal,
    toggleFavorite,
    archiveMeal,
  };
}

module.exports = {
  createMealsService,
};
