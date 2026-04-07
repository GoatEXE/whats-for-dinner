const express = require("express");
const { validate } = require("../../lib/validation");
const {
  mealWriteSchema,
  mealPatchSchema,
  mealIdParamSchema,
  mealListQuerySchema,
  favoriteBodySchema,
} = require("./meals.schemas");

function createMealsRouter(mealsService) {
  const router = express.Router();

  router.get("/", validate(mealListQuerySchema, "query"), (req, res) => {
    const meals = mealsService.listMeals(req.query);
    res.json({ data: meals });
  });

  router.post("/", validate(mealWriteSchema, "body"), (req, res) => {
    const meal = mealsService.createMeal(req.body);
    res.status(201).json({ data: meal });
  });

  router.get("/:id", validate(mealIdParamSchema, "params"), (req, res) => {
    const meal = mealsService.getMealById(req.params.id);
    res.json({ data: meal });
  });

  router.patch(
    "/:id",
    validate(mealIdParamSchema, "params"),
    validate(mealPatchSchema, "body"),
    (req, res) => {
      const meal = mealsService.updateMeal(req.params.id, req.body);
      res.json({ data: meal });
    },
  );

  router.delete("/:id", validate(mealIdParamSchema, "params"), (req, res) => {
    const meal = mealsService.archiveMeal(req.params.id);
    res.json({ data: meal });
  });

  router.post(
    "/:id/favorite",
    validate(mealIdParamSchema, "params"),
    validate(favoriteBodySchema, "body"),
    (req, res) => {
      const meal = mealsService.toggleFavorite(
        req.params.id,
        req.body.isFavorite,
      );
      res.json({ data: meal });
    },
  );

  return router;
}

module.exports = {
  createMealsRouter,
};
