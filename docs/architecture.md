# What's for Dinner — Initial Architecture Proposal

## Goals
- Keep the first version easy to run locally in Docker.
- Use Node + Express, with minimal moving parts.
- Support the core dinner workflow:
  - store meals
  - mark favorites
  - store meal ingredients
  - select on-hand ingredients or use a saved pantry list
  - find exact and partial meal matches
  - pick a random meal
- Stay easy to extend later without starting with unnecessary complexity.

## Assumptions
- Single household / family use; no multi-user auth in v1.
- Low traffic and low write concurrency.
- Data should persist across container restarts.
- Ingredient matching can start with normalized exact-name matching; fuzzy aliases can wait.
- Quantity/unit conversion is out of scope for v1; store ingredient amounts as display text only.
- We should avoid axios entirely unless a later feature truly needs an HTTP client; Node's built-in `fetch` is enough.

## Recommended Stack
- **Runtime:** Node.js 22 LTS
- **Web framework:** Express 5
- **Database:** SQLite
- **DB access:** `better-sqlite3` with checked-in SQL migrations
- **Validation:** Zod
- **Testing:** Vitest + Supertest
- **Formatting/linting:** Prettier + ESLint
- **Container base image:** `node:22-bookworm-slim`

### Why this stack
- **SQLite** is the best fit for a family utility app in an empty repo: no separate DB container, simple backups, and enough power for relational meal/ingredient matching.
- **Hand-written SQL migrations** keep the system understandable and reduce ORM overhead in a small app.
- **better-sqlite3** is pragmatic for a low-concurrency local app and keeps repository code straightforward.
- **Express + Zod** is lightweight and familiar.
- **Debian slim over Alpine** avoids native-module friction with SQLite packages.

## Runtime Design
Use a simple layered structure:

`route -> validation -> service -> repository -> sqlite`

Guidelines:
- Keep route handlers thin.
- Put matching/random-selection rules in service functions.
- Keep SQL in repository files, not inline in routes.
- Avoid generic abstraction layers unless there is a real second implementation.

## Storage Choice
Use a single SQLite file mounted from Docker:
- DB path: `/data/whats-for-dinner.sqlite`
- Persist via Docker volume

This keeps local setup to one container while still supporting relational queries for ingredient matching.

## Data Model

### `meals`
- `id`
- `name` (unique per normalized name if desired)
- `notes` (nullable)
- `prep_minutes` (nullable)
- `is_favorite` (boolean, default false)
- `is_archived` (boolean, default false)
- `created_at`
- `updated_at`

### `ingredients`
- `id`
- `name`
- `normalized_name` (unique)
- `created_at`

### `meal_ingredients`
- `meal_id`
- `ingredient_id`
- `quantity_text` (nullable, e.g. `1 lb`, `2 cups`)
- `is_optional` (boolean, default false)
- `sort_order`

Composite uniqueness: `(meal_id, ingredient_id)`

### `pantry_items`
Represents the household's saved on-hand ingredient list.
- `ingredient_id` (unique)
- `quantity_text` (nullable)
- `updated_at`

### `meal_history`
Tracks meals that were actually chosen/served.
- `id`
- `meal_id`
- `served_on`
- `source` (`manual`, `random`, `match`)
- `created_at`

### Optional later tables
- `tags`
- `meal_tags`
- `ingredient_aliases`

## Key Domain Rules
- Ingredient names are normalized on write: lowercase, trimmed, repeated whitespace collapsed.
- Matching is based on ingredient IDs, not raw strings.
- Optional ingredients do not block a meal from being a full match.
- Archived meals are hidden from normal list/suggestion endpoints.
- Random selection can optionally exclude meals served in the last _N_ days.

## API Shape
Use JSON APIs first. The same Express app can later serve simple HTML pages if desired.

### Health
- `GET /health`

### Meals
- `GET /api/meals`
  - filters: `favorite`, `archived`, `tag`, `q`
- `POST /api/meals`
- `GET /api/meals/:id`
- `PATCH /api/meals/:id`
- `DELETE /api/meals/:id`
  - soft delete via `is_archived=true` is safer than hard delete
- `POST /api/meals/:id/favorite`
  - toggle or explicitly set favorite

### Pantry
- `GET /api/pantry`
- `PUT /api/pantry`
  - replace the saved pantry ingredient list in one request
- `POST /api/pantry/items`
- `DELETE /api/pantry/items/:ingredientId`

### Suggestions / Matching
- `POST /api/suggestions/matches`
  - request body can support:
    - `ingredientIds` or ingredient names
    - `useSavedPantry`
    - `favoritesOnly`
    - `includePartial`
  - response should include:
    - matched meals
    - required ingredient count
    - matched required count
    - missing required ingredients
    - optional ingredients present/missing if useful

- `GET /api/suggestions/random`
  - query options:
    - `favoritesOnly`
    - `fullMatchOnly`
    - `excludeServedWithinDays`

### History
- `GET /api/history`
- `POST /api/history`
  - log that a meal was chosen/served

## Matching Behavior
For meal matching, rank results by:
1. full matches before partial matches
2. higher required match percentage
3. fewer missing required ingredients
4. favorites first
5. alphabetical name as stable tie-breaker

Each match response should include a `missingIngredients` list so partial matches are still actionable.

## Random Meal Behavior
Default random selection should:
- ignore archived meals
- include all meals unless filters are passed

Useful filters:
- `favoritesOnly=true`
- `fullMatchOnly=true`
- `excludeServedWithinDays=7`

This gives the family both a pure random option and a realistic "pick from what we can cook now" option.

## Suggested Project Structure

```text
src/
  app.js
  server.js
  config/
    env.js
  db/
    connection.js
    migrate.js
    migrations/
    seed.js
  middleware/
    error-handler.js
    not-found.js
  lib/
    normalize.js
    validation.js
  modules/
    meals/
      meals.routes.js
      meals.service.js
      meals.repo.js
      meals.schemas.js
    pantry/
      pantry.routes.js
      pantry.service.js
      pantry.repo.js
      pantry.schemas.js
    suggestions/
      suggestions.routes.js
      suggestions.service.js
      suggestions.repo.js
      suggestions.schemas.js
    history/
      history.routes.js
      history.service.js
      history.repo.js
      history.schemas.js
test/
  integration/
  unit/
```

## Validation and Quality Gates
Minimum quality bar for the initial project:
- **Env validation** with Zod at startup
- **Request validation** for every write endpoint
- **Central error handler** with consistent JSON error shape
- **Migration script** that runs on container startup or via an explicit command
- **Health endpoint** for Docker healthchecks
- **Automated tests**:
  - route smoke tests
  - meal CRUD tests
  - pantry update tests
  - match ranking tests
  - random selection filter tests
- **Lint + format** in CI
- **Docker build** in CI to catch packaging issues early

## Docker Recommendation
Use one app container and one persistent volume.

### Files to add early
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`

### Container behavior
- install dependencies with `npm ci`
- run migrations at startup
- store SQLite DB under `/data`
- expose port `3000`
- add a healthcheck hitting `/health`

## Phased Implementation Plan

### Phase 1 — Skeleton and persistence
- Initialize Node project
- Add Express app, health route, config loading
- Add Dockerfile and docker-compose
- Add SQLite connection + migration runner
- Add schema for meals, ingredients, meal_ingredients, pantry_items, meal_history
- Add seed script with a few example meals

**Exit criteria:** container boots, migrations run, health endpoint passes.

### Phase 2 — Meal management
- Implement meal CRUD
- Support ingredient creation/reuse during meal create/update
- Add favorite toggle
- Add soft archive instead of hard delete
- Add validation and integration tests

**Exit criteria:** meals and ingredients can be managed end-to-end.

### Phase 3 — Pantry and matching
- Implement pantry read/write endpoints
- Implement match endpoint using saved pantry or ad hoc ingredient list
- Return full/partial match metadata and missing ingredients
- Add ranking tests

**Exit criteria:** app can recommend meals based on available ingredients.

### Phase 4 — Randomization and history
- Implement random meal endpoint with filters
- Add meal history logging
- Support `excludeServedWithinDays`
- Add tests for selection rules

**Exit criteria:** app can pick a fair random meal and avoid recent repeats.

### Phase 5 — Polish / useful adjacent features
Choose only if time remains:
- tags like `quick`, `kid-friendly`, `vegetarian`
- import/export JSON backup
- simple server-rendered pages or static frontend served by Express
- ingredient aliases/synonyms

## Deliberately Deferred
To keep v1 pragmatic, do **not** start with:
- user accounts / auth
- Postgres
- ORMs unless the implementer has a strong preference
- fuzzy NLP ingredient matching
- unit conversion engine
- separate frontend repo/build pipeline
- background jobs or queues
- external APIs

## Migration / Extension Notes
If this grows beyond a single-household local app:
- Keep repository boundaries clean so SQLite can later be swapped for Postgres.
- Add a `households` table before adding auth/multi-user features.
- Introduce tags and aliases only after the base workflow is stable.

## Recommendation to Backend Worker
Build the MVP as a **single Dockerized Express service backed by SQLite**, with **JSON APIs first**, strict validation, and tests around the ingredient-matching logic. That is the lowest-complexity path that still leaves room for a nicer UI or a larger database later.
