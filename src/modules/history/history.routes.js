const express = require("express");
const { validate } = require("../../lib/validation");
const { historyQuerySchema, historyWriteSchema } = require("./history.schemas");

function createHistoryRouter(historyService) {
  const router = express.Router();

  router.get("/", validate(historyQuerySchema, "query"), (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    res.json({ data: historyService.listHistory(limit) });
  });

  router.post("/", validate(historyWriteSchema, "body"), (req, res) => {
    const historyItem = historyService.addHistory(req.body);
    res.status(201).json({ data: historyItem });
  });

  return router;
}

module.exports = {
  createHistoryRouter,
};
