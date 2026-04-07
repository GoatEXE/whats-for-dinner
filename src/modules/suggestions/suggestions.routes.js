const express = require("express");
const { validate } = require("../../lib/validation");
const { matchBodySchema, randomQuerySchema } = require("./suggestions.schemas");

function createSuggestionsRouter(suggestionsService) {
  const router = express.Router();

  router.post("/matches", validate(matchBodySchema, "body"), (req, res) => {
    res.json({ data: suggestionsService.findMatches(req.body) });
  });

  router.get("/random", validate(randomQuerySchema, "query"), (req, res) => {
    res.json({ data: suggestionsService.pickRandomMeal(req.query) });
  });

  return router;
}

module.exports = {
  createSuggestionsRouter,
};
