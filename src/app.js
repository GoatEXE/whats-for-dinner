const path = require("node:path");
const express = require("express");
const { createCatalogRepo } = require("./modules/catalog/catalog.repo");
const { createMealsRepo } = require("./modules/meals/meals.repo");
const { createMealsService } = require("./modules/meals/meals.service");
const { createMealsRouter } = require("./modules/meals/meals.routes");
const { createPantryRepo } = require("./modules/pantry/pantry.repo");
const { createPantryService } = require("./modules/pantry/pantry.service");
const { createPantryRouter } = require("./modules/pantry/pantry.routes");
const { createHistoryRepo } = require("./modules/history/history.repo");
const { createHistoryService } = require("./modules/history/history.service");
const { createHistoryRouter } = require("./modules/history/history.routes");
const {
  createSuggestionsRepo,
} = require("./modules/suggestions/suggestions.repo");
const {
  createSuggestionsService,
} = require("./modules/suggestions/suggestions.service");
const {
  createSuggestionsRouter,
} = require("./modules/suggestions/suggestions.routes");
const {
  createShoppingListRepo,
} = require("./modules/shopping-list/shopping-list.repo");
const {
  createShoppingListService,
} = require("./modules/shopping-list/shopping-list.service");
const {
  createShoppingListRouter,
} = require("./modules/shopping-list/shopping-list.routes");
const {
  createWeeklyPlansRepo,
} = require("./modules/weekly-plans/weekly-plans.repo");
const {
  createWeeklyPlansService,
} = require("./modules/weekly-plans/weekly-plans.service");
const {
  createWeeklyPlansRouter,
} = require("./modules/weekly-plans/weekly-plans.routes");
const { errorHandler } = require("./middleware/error-handler");
const { notFoundHandler } = require("./middleware/not-found");

function createApp({ db, config }) {
  const app = express();
  const catalogRepo = createCatalogRepo(db);
  const mealsRepo = createMealsRepo(db, catalogRepo);
  const pantryRepo = createPantryRepo(db, catalogRepo);
  const historyRepo = createHistoryRepo(db);
  const suggestionsRepo = createSuggestionsRepo(
    mealsRepo,
    pantryRepo,
    historyRepo,
  );
  const shoppingListRepo = createShoppingListRepo(mealsRepo, pantryRepo);
  const weeklyPlansRepo = createWeeklyPlansRepo(db);

  const mealsService = createMealsService(mealsRepo);
  const pantryService = createPantryService(pantryRepo, catalogRepo);
  const historyService = createHistoryService(historyRepo, mealsRepo);
  const suggestionsService = createSuggestionsService(
    suggestionsRepo,
    catalogRepo,
  );
  const shoppingListService = createShoppingListService(
    shoppingListRepo,
    catalogRepo,
  );
  const weeklyPlansService = createWeeklyPlansService(
    weeklyPlansRepo,
    mealsRepo,
    historyService,
    suggestionsService,
  );

  app.locals.config = config;

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      environment: config.nodeEnv,
      dbPath: config.dbPath,
    });
  });

  app.get("/api/ingredients", (_req, res) => {
    res.json({ data: catalogRepo.listIngredients() });
  });

  app.use("/api/meals", createMealsRouter(mealsService));
  app.use("/api/pantry", createPantryRouter(pantryService));
  app.use("/api/suggestions", createSuggestionsRouter(suggestionsService));
  app.use("/api/shopping-list", createShoppingListRouter(shoppingListService));
  app.use("/api/history", createHistoryRouter(historyService));
  app.use("/api/weekly-plans", createWeeklyPlansRouter(weeklyPlansService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
