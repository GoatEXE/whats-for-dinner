const express = require("express");
const { validate } = require("../../lib/validation");
const { shoppingListGenerateSchema } = require("./shopping-list.schemas");

function createShoppingListRouter(shoppingListService) {
  const router = express.Router();

  router.post(
    "/generate",
    validate(shoppingListGenerateSchema, "body"),
    (req, res) => {
      const shoppingList = shoppingListService.generate(req.body);
      res.json({ data: shoppingList });
    },
  );

  return router;
}

module.exports = {
  createShoppingListRouter,
};
