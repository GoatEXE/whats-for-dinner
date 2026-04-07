const express = require("express");
const { validate } = require("../../lib/validation");
const {
  pantryItemSchema,
  pantryReplaceSchema,
  pantryDeleteParamSchema,
} = require("./pantry.schemas");

function createPantryRouter(pantryService) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json({ data: pantryService.listPantryItems() });
  });

  router.put("/", validate(pantryReplaceSchema, "body"), (req, res) => {
    const pantry = pantryService.replacePantryItems(req.body.items);
    res.json({ data: pantry });
  });

  router.post("/items", validate(pantryItemSchema, "body"), (req, res) => {
    const pantry = pantryService.addPantryItem(req.body);
    res.status(201).json({ data: pantry });
  });

  router.delete(
    "/items/:ingredientId",
    validate(pantryDeleteParamSchema, "params"),
    (req, res) => {
      const pantry = pantryService.removePantryItem(req.params.ingredientId);
      res.json({ data: pantry });
    },
  );

  return router;
}

module.exports = {
  createPantryRouter,
};
