const express = require("express");
const { validate } = require("../../lib/validation");
const {
  createPlanSchema,
  updateSlotSchema,
  randomSlotSchema,
  autofillSchema,
  dayParamSchema,
  archivedPlansQuerySchema,
  weeklyPlanIdParamSchema,
} = require("./weekly-plans.schemas");

function createWeeklyPlansRouter(weeklyPlansService) {
  const router = express.Router();

  router.post("/", validate(createPlanSchema, "body"), (req, res) => {
    const plan = weeklyPlansService.createPlan(req.body.weekStart);
    res.status(201).json({ data: plan });
  });

  router.post(
    "/from/:id",
    validate(weeklyPlanIdParamSchema, "params"),
    validate(createPlanSchema, "body"),
    (req, res) => {
      const plan = weeklyPlansService.createPlanFromSource(
        req.params.id,
        req.body.weekStart,
      );
      res.status(201).json({ data: plan });
    },
  );

  router.get("/current", (_req, res) => {
    res.json({ data: weeklyPlansService.getCurrentPlan() });
  });

  router.post(
    "/current/autofill",
    validate(autofillSchema, "body"),
    (req, res) => {
      const result = weeklyPlansService.autofillEmptySlots(req.body);
      res.json({
        data: {
          ...result.plan,
          autofillResult: result.autofillResult,
        },
      });
    },
  );

  router.patch(
    "/current/slots/:day",
    validate(dayParamSchema, "params"),
    validate(updateSlotSchema, "body"),
    (req, res) => {
      const plan = weeklyPlansService.updateSlot(req.params.day, req.body);
      res.json({ data: plan });
    },
  );

  router.post(
    "/current/slots/:day/random",
    validate(dayParamSchema, "params"),
    validate(randomSlotSchema, "body"),
    (req, res) => {
      const plan = weeklyPlansService.fillSlotRandom(req.params.day, req.body);
      res.json({ data: plan });
    },
  );

  router.post(
    "/current/slots/:day/serve",
    validate(dayParamSchema, "params"),
    (req, res) => {
      const plan = weeklyPlansService.serveSlot(req.params.day);
      res.json({ data: plan });
    },
  );

  router.get(
    "/history",
    validate(archivedPlansQuerySchema, "query"),
    (req, res) => {
      const limit = Number(req.query.limit ?? 10);
      res.json({ data: weeklyPlansService.listArchivedPlans(limit) });
    },
  );

  router.get(
    "/history/:id",
    validate(weeklyPlanIdParamSchema, "params"),
    (req, res) => {
      res.json({ data: weeklyPlansService.getPlanById(req.params.id) });
    },
  );

  return router;
}

module.exports = {
  createWeeklyPlansRouter,
};
