# What's for Dinner

A pragmatic meal planning app built with Node.js, Express, SQLite, and a small vanilla web UI.

## Features

- **Meal library** — CRUD with ingredient lists, prep time, notes, favorites, archive, and tags
- **Pantry tracking** — maintain on-hand ingredient inventory
- **Meal suggestions** — match suggestions based on pantry or ad hoc ingredient names; random picker with filters for favorites, pantry-ready meals, and recent-history exclusion
- **Weekly planning** — create and manage 7-day meal plans; assign meals manually, fill slots randomly with filters, or auto-fill all empty days at once; mark meals as served; reuse past plans as starting points for new weeks
- **Shopping lists** — generate combined shopping lists from selected meals or the full weekly plan versus pantry ingredients; deduplicate shared ingredients across meals; copy-friendly plain text export
- **Plan sharing** — copy weekly plan text or combined plan-plus-shopping-list in one action
- **Meal history** — track recently served dinners with source attribution (manual or from plan)
- **Dockerized deployment** — SQLite persistence with volume support
- **Migrations and seeding** — checked-in SQL migrations and sample seed data
- **Testing and validation** — Zod validation, centralized error handling, and automated test coverage

## Stack

- Node.js 22
- Express 5
- SQLite via `better-sqlite3`
- Zod validation
- Vitest + Supertest
- ESLint + Prettier

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env file if you want custom settings:

   ```bash
   cp .env.example .env
   ```

3. Start the app:

   ```bash
   npm run start
   ```

The server automatically:

- validates env
- runs migrations
- seeds sample data if the database is empty

Open http://localhost:3000

## Run with Docker

```bash
docker compose up --build
```

This starts the app on http://localhost:3000 and persists SQLite data in the `whats-for-dinner-data` Docker volume.

## Weekly planning workflow

1. **Create a plan** — Start a new 7-day plan for the upcoming week (Monday–Sunday)
2. **Fill slots** — Assign meals manually, use per-slot random fill with filters, or auto-fill all empty days at once
3. **Generate shopping list** — One-click shopping list generation for all planned meals
4. **Track progress** — Mark meals as served during the week
5. **Reuse plans** — Copy a past week's plan as a starting point for a new week

The app maintains one active weekly plan at a time. When you create a new plan for a different week, the current plan is automatically archived and remains accessible in plan history.

## Useful scripts

```bash
npm run migrate
npm run seed
npm run test
npm run lint
npm run typecheck
npm run format
```

## Environment variables

| Name            | Default                                                                              | Description                                      |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `PORT`          | `3000`                                                                               | HTTP port                                        |
| `DB_PATH`       | `./data/whats-for-dinner.sqlite` locally / `/data/whats-for-dinner.sqlite` in Docker | SQLite database path                             |
| `SEED_ON_EMPTY` | `true`                                                                               | Seeds sample data when the database has no meals |

## API overview

**Health & catalog:**
- `GET /health`
- `GET /api/ingredients`

**Meals:**
- `GET /api/meals`
- `POST /api/meals`
- `GET /api/meals/:id`
- `PATCH /api/meals/:id`
- `DELETE /api/meals/:id`
- `POST /api/meals/:id/favorite`

**Pantry:**
- `GET /api/pantry`
- `PUT /api/pantry`
- `POST /api/pantry/items`
- `DELETE /api/pantry/items/:ingredientId`

**Suggestions:**
- `POST /api/suggestions/matches`
- `GET /api/suggestions/random`

**Weekly plans:**
- `POST /api/weekly-plans` — create a new weekly plan
- `POST /api/weekly-plans/from/:id` — create a new plan from an archived plan
- `GET /api/weekly-plans/current` — get the active weekly plan
- `POST /api/weekly-plans/current/autofill` — auto-fill empty plan slots with random meals
- `PATCH /api/weekly-plans/current/slots/:day` — assign or clear a meal for a specific day
- `POST /api/weekly-plans/current/slots/:day/random` — fill a slot with a random meal
- `POST /api/weekly-plans/current/slots/:day/serve` — mark a planned meal as served
- `GET /api/weekly-plans/history` — list past archived plans
- `GET /api/weekly-plans/history/:id` — get a specific plan by ID

**Shopping list:**
- `POST /api/shopping-list/generate`

**History:**
- `GET /api/history`
- `POST /api/history`

## Shopping list generation

`POST /api/shopping-list/generate` generates a shopping list from one or more meals. This endpoint is used both for standalone meal selections and when generating a list from the current weekly plan.

Request body:

```json
{
  "mealIds": [1, 2],
  "useSavedPantry": true,
  "ingredientIds": [5],
  "ingredientNames": ["Milk"],
  "includeOptional": false
}
```

Defaults and behavior:

- `mealIds` is required
- `useSavedPantry` defaults to `true`
- `includeOptional` defaults to `false`
- `ingredientIds` and `ingredientNames` are optional ad hoc request inputs layered on top of the saved pantry for that one request
- `ingredientNames` are normalized for matching against existing catalog ingredients, but unknown names are ignored and are **not** persisted into `/api/ingredients`
- boolean inputs must be real booleans or the exact strings `"true"` / `"false"`; other values fail validation with `400`

Response highlights:

- `selectedMeals`: `{ id, name }` summaries for the requested meals
- `availableIngredients`: the deduplicated pantry/on-hand ingredient set used for comparison
- `requiredOnHand`: unique required ingredients already covered by the available set
- `requiredToBuy`: unique required ingredients still needed
- `optionalToBuy`: optional-only ingredients still needed when `includeOptional=true`
- `summary`: selected meal / on-hand / to-buy counts
- `copyText`: copy/paste-friendly plain text block for docs or notes

When the same ingredient appears in multiple selected meals, the response keeps one ingredient entry and aggregates `mealNames` and `quantityHints` instead of attempting quantity arithmetic.

## Notes

- Ingredient matching uses normalized exact-name matching.
- Quantities are stored as display text only; unit conversion is intentionally out of scope.
- Archived meals are hidden from normal meal lists and suggestion flows, but remain in past weekly plans where they were originally assigned.
- Weekly plan autofill and per-slot random fill respect the same filters as the standalone random picker (favorites, pantry-ready, avoid recent history).
- When reusing a past plan, meal assignments and notes are copied; served status is not.
