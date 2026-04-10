# whats-for-dinner codebase inventory

Compiled from the current repository state for React Native/Expo migration planning.

## 1) API endpoints

### Health / metadata
- `GET /health` — returns `{ status, environment, dbPath }` for basic app/db health.
- `GET /api/ingredients` — returns the ingredient catalog used for autocomplete and matching.

### Meals
- `GET /api/meals` — lists active meals by default; supports query filters `favorite`, `archived`, `tag`, and `q` (name/notes search).
- `GET /api/meals/export` — exports all active meals in a portable recipe envelope JSON and sets a download-friendly filename.
- `POST /api/meals` — creates a meal with ingredients/tags/favorite state.
- `POST /api/meals/import` — imports meals from the portable recipe envelope, reporting imported/skipped/failed rows.
- `GET /api/meals/:id` — fetches one meal by id.
- `PATCH /api/meals/:id` — updates an existing meal.
- `DELETE /api/meals/:id` — archives a meal (soft delete via `is_archived = 1`).
- `POST /api/meals/:id/favorite` — toggles or sets favorite status.

### Pantry
- `GET /api/pantry` — lists saved pantry items.
- `PUT /api/pantry` — replaces the entire pantry with the provided items.
- `POST /api/pantry/items` — adds or upserts one pantry item.
- `DELETE /api/pantry/items/:ingredientId` — removes one pantry item.

### Ingredient suggestions / meal matching
- `POST /api/suggestions/matches` — finds candidate meals against pantry and/or ad hoc ingredients.
- `GET /api/suggestions/random` — picks one random meal subject to filters.

### Shopping list
- `POST /api/shopping-list/generate` — builds a consolidated shopping list from selected meals plus optional pantry/on-hand overrides.

### Meal history
- `GET /api/history` — lists recent meal history, with a `limit` query parameter.
- `POST /api/history` — records a meal as served in history.

### Weekly plans
- `POST /api/weekly-plans` — creates a new weekly plan for a Monday date; archives any previous active plan if needed.
- `POST /api/weekly-plans/from/:id` — creates a new weekly plan by copying another plan’s slot assignments.
- `GET /api/weekly-plans/current` — returns the active weekly plan.
- `POST /api/weekly-plans/current/autofill` — fills empty slots in the active plan using the random-pick logic.
- `PATCH /api/weekly-plans/current/slots/:day` — updates a slot’s meal and/or notes.
- `POST /api/weekly-plans/current/slots/:day/random` — fills one slot with a random meal.
- `POST /api/weekly-plans/current/slots/:day/serve` — marks a planned meal as served and records it in history.
- `GET /api/weekly-plans/history` — lists archived weekly plans.
- `GET /api/weekly-plans/history/:id` — returns archived plan detail.

## 2) Database schema

### `meals`
- `id` INTEGER PK AUTOINCREMENT
- `name` TEXT NOT NULL
- `normalized_name` TEXT NOT NULL UNIQUE
- `notes` TEXT
- `prep_minutes` INTEGER
- `is_favorite` INTEGER NOT NULL DEFAULT 0
- `is_archived` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Relationships:
- parent to `meal_ingredients.meal_id` (`ON DELETE CASCADE`)
- parent to `meal_tags.meal_id` (`ON DELETE CASCADE`)
- parent to `meal_history.meal_id` (`ON DELETE CASCADE`)
- referenced by `weekly_plan_slots.meal_id` (`ON DELETE SET NULL`)

Indexes/triggers:
- `idx_meals_archived_favorite (is_archived, is_favorite)`
- trigger `trg_meals_updated_at` updates `updated_at` on writes

### `ingredients`
- `id` INTEGER PK AUTOINCREMENT
- `name` TEXT NOT NULL
- `normalized_name` TEXT NOT NULL UNIQUE
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Relationships:
- parent to `meal_ingredients.ingredient_id` (`ON DELETE RESTRICT`)
- parent to `pantry_items.ingredient_id` (`ON DELETE CASCADE`)

Indexes:
- `idx_ingredients_normalized_name (normalized_name)`

### `meal_ingredients`
- `meal_id` INTEGER NOT NULL
- `ingredient_id` INTEGER NOT NULL
- `quantity_text` TEXT
- `is_optional` INTEGER NOT NULL DEFAULT 0
- `sort_order` INTEGER NOT NULL DEFAULT 0
- PK: `(meal_id, ingredient_id)`

Relationships:
- `meal_id` → `meals.id` (`ON DELETE CASCADE`)
- `ingredient_id` → `ingredients.id` (`ON DELETE RESTRICT`)

### `pantry_items`
- `ingredient_id` INTEGER PK
- `quantity_text` TEXT
- `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Relationships:
- `ingredient_id` → `ingredients.id` (`ON DELETE CASCADE`)

Indexes:
- `idx_pantry_updated_at (updated_at)`

### `meal_history`
- `id` INTEGER PK AUTOINCREMENT
- `meal_id` INTEGER NOT NULL
- `served_on` TEXT NOT NULL (ISO date)
- `source` TEXT NOT NULL DEFAULT `'manual'`
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Relationships:
- `meal_id` → `meals.id` (`ON DELETE CASCADE`)

Indexes:
- `idx_history_served_on (served_on)`

### `tags`
- `id` INTEGER PK AUTOINCREMENT
- `name` TEXT NOT NULL
- `normalized_name` TEXT NOT NULL UNIQUE
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

Relationships:
- parent to `meal_tags.tag_id` (`ON DELETE CASCADE`)

### `meal_tags`
- `meal_id` INTEGER NOT NULL
- `tag_id` INTEGER NOT NULL
- PK: `(meal_id, tag_id)`

Relationships:
- `meal_id` → `meals.id` (`ON DELETE CASCADE`)
- `tag_id` → `tags.id` (`ON DELETE CASCADE`)

Indexes:
- `idx_meal_tags_tag_id (tag_id)`

### `weekly_plans`
- `id` INTEGER PK AUTOINCREMENT
- `week_start` TEXT NOT NULL
- `is_archived` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL DEFAULT (SQLite precise timestamp)
- `updated_at` TEXT NOT NULL DEFAULT (SQLite precise timestamp)

Relationships:
- parent to `weekly_plan_slots.plan_id` (`ON DELETE CASCADE`)

Indexes/constraints:
- unique active week start: `idx_weekly_plans_active_week_start` on `(week_start)` where `is_archived = 0`
- only one active plan: `idx_weekly_plans_single_active` on `(is_archived)` where `is_archived = 0`
- `idx_weekly_plans_is_archived_week_start (is_archived, week_start DESC)`
- trigger `trg_weekly_plans_updated_at` keeps `updated_at` monotonic

### `weekly_plan_slots`
- `plan_id` INTEGER NOT NULL
- `day` INTEGER NOT NULL CHECK `0..6`
- `meal_id` INTEGER
- `notes` TEXT
- PK: `(plan_id, day)`

Relationships:
- `plan_id` → `weekly_plans.id` (`ON DELETE CASCADE`)
- `meal_id` → `meals.id` (`ON DELETE SET NULL`)

Indexes:
- `idx_weekly_plan_slots_meal_id (meal_id)`

### Migration note
- `003_weekly_plans_hardening.sql` archives older active plans so only one active plan remains after migration.

## 3) Business logic

### Ingredient resolution and normalization
- Ingredient and tag names are normalized before persistence/lookups (`normalizeName`, `normalizeTag`).
- Pantry input may be by `ingredientId` or `name`; names can create catalog ingredients.
- Suggestions/shopping can resolve ad hoc ingredient names differently depending on the feature:
  - suggestions may create unknown ingredient catalog entries;
  - shopping list generation resolves by name without persisting unknown names.

### Meal CRUD
- Meal creation and update are transactional: create/update meal row, then replace all ingredient/tag relationships.
- Duplicate meal names are rejected via `normalized_name` uniqueness and surfaced as `409`.
- Archiving is soft delete (`is_archived = 1`), not row deletion.
- Favorite toggle can either explicitly set a boolean or flip the current value.

### Import/export
- Export emits a portable envelope: `{ format, version, exportedAt, meals[] }` and strips internal ids.
- Import validates the envelope and each meal individually.
- Import deduplicates by normalized meal name; invalid meals are reported in `failed`, duplicates in `skipped`.

### Ingredient matching
- `buildMatch()` computes required vs optional ingredient matches per meal.
- Match score is based on required ingredients only.
- Sorting prefers:
  1. full matches
  2. higher match percentage
  3. fewer missing required ingredients
  4. favorites
  5. name
- `includePartial=false` filters out partial matches.

### Random meal picker
- Candidate meals come from active non-archived meals, optionally favorites-only.
- Random selection excludes meals served within a configurable lookback window.
- Optional exclusion list can remove explicitly blocked meals.
- `fullMatchOnly=true` further restricts candidates to meals that fully match current pantry/ad hoc availability.
- Empty candidate set throws `404`.

### Shopping list generation
- Selected meal ids are deduplicated while preserving order.
- All meal ingredients are aggregated by ingredient id across meals.
- Required ingredients are split into:
  - `requiredToBuy` (missing)
  - `requiredOnHand` (available)
- Optional ingredients are only included in `optionalToBuy` when `includeOptional=true`.
- Output includes a summary and `copyText` plain-text export.

### Weekly planning
- Only one active weekly plan exists at a time.
- New plan creation archives any prior active plan and inserts seven empty slots.
- Reuse-from-source copies slot assignments and notes into a new week; served state is not copied.
- `updateSlot()` keeps existing notes unless the request explicitly changes them; clearing a meal also clears notes unless notes are explicitly provided.
- `fillSlotRandom()` respects planned-meal exclusion across the week and avoids reusing the current slot meal unless it is also used elsewhere.
- `autofillEmptySlots()` fills empty days in day order, cumulatively expanding the exclusion set so the same meal is not reused within the same plan.
- Autofill returns a summary with filled/skipped counts and a `noMoreCandidates` flag when the picker runs out.
- Serving a slot records meal history with `source: 'plan'` and derives served status from matching `(meal_id, served_on)` history rows.
- Archived plan detail preserves meal summaries even when the meal itself has been archived later.

### Pantry
- Pantry replacement is transactional and fully replaces the prior pantry.
- Items are deduped by ingredient id after input resolution.

## 4) Frontend features

### App shell / navigation
- Tabbed layout with three main tabs:
  - **Plan**
  - **Shop**
  - **Meals**
- Tabs are keyboard navigable and remember the active tab in session storage.
- Global refresh button reloads all data.

### Plan tab
- **Quick picker**: random meal picker with favorites/full-match/recent-history filters.
- **Weekly plan**: create a weekly plan, assign meals to days, random-fill a day, clear a day, add notes, mark served, autofill empty days, and copy/share plan text.
- **Past plans**: expandable archive of old weekly plans, with reuse and copy actions.
- **Recent history**: list of recently served meals.

### Shop tab
- **Shopping list**:
  - manual selection from meal cards in Meals tab
  - generate from current weekly plan
  - include pantry and optional items
  - copy generated list to clipboard
- **Pantry**: add/remove pantry ingredients.
- **Ingredient matches**: pantry-based and ad hoc pantry-ready meal suggestions.

### Meals tab
- **Meal editor**: create/edit meals with name, prep time, notes, tags, favorite flag, and a dynamic ingredient list.
- **Meal library**: searchable cards with favorite/archive/edit/serve/add-to-list actions.
- **Import/Export** buttons for recipe data.

### UI components / behaviors
- Status banner for success/error/warning feedback.
- Confirmation/prompt modal dialog used for destructive actions and plan creation/reuse.
- Datalist autocomplete for ingredient names.

## 5) Data models / Zod schemas

### Meals (`src/modules/meals/meals.schemas.js`)
- `ingredientInputSchema`
  - `name` string 1..120, trimmed
  - `quantityText` nullable/trimmed string
  - `isOptional` booleanish, default `false`
- `mealWriteSchema`
  - `name` string 1..120
  - `notes` nullable string
  - `prepMinutes` integer 0..1440 or null
  - `isFavorite` booleanish, default `false`
  - `ingredients` min 1
  - `tags` up to 10 strings, default `[]`
- `mealPatchSchema` — partial meal write schema, requires at least one field
- `mealIdParamSchema` — positive integer `id`
- `mealListQuerySchema`
  - `favorite`, `archived` booleanish
  - `tag` string
  - `q` string
- `importBodySchema`
  - `format = 'whats-for-dinner-recipes'`
  - `version = 1`
  - `exportedAt` optional string
  - `meals` array
- `favoriteBodySchema`
  - `isFavorite` booleanish

### Pantry (`src/modules/pantry/pantry.schemas.js`)
- `pantryItemSchema`
  - `ingredientId` positive integer optional
  - `name` string optional
  - `quantityText` nullable/trimmed string
  - refinement: must supply `ingredientId` or `name`
- `pantryReplaceSchema` — `{ items: pantryItemSchema[] }`
- `pantryDeleteParamSchema` — positive integer `ingredientId`

### Suggestions (`src/modules/suggestions/suggestions.schemas.js`)
- `matchBodySchema`
  - `ingredientIds` positive integer array optional
  - `ingredientNames` string array optional
  - `useSavedPantry` booleanish, default `false`
  - `favoritesOnly` booleanish, default `false`
  - `includePartial` booleanish, default `true`
  - refinement: must provide ids, names, or `useSavedPantry=true`
- `randomQuerySchema`
  - `favoritesOnly` booleanish, default `false`
  - `fullMatchOnly` booleanish, default `false`
  - `excludeServedWithinDays` integer 0..365, default `0`

### Shopping list (`src/modules/shopping-list/shopping-list.schemas.js`)
- `shoppingListGenerateSchema`
  - `mealIds` positive integer array 1..25
  - `useSavedPantry` strict booleanish, default `true`
  - `ingredientIds` positive integer array optional
  - `ingredientNames` string array optional
  - `includeOptional` strict booleanish, default `false`

### History (`src/modules/history/history.schemas.js`)
- `historyQuerySchema`
  - `limit` integer 1..100, default `20`
- `historyWriteSchema`
  - `mealId` positive integer
  - `servedOn` optional ISO date string `YYYY-MM-DD`
  - `source` enum: `manual | random | match | plan`, default `manual`

### Weekly plans (`src/modules/weekly-plans/weekly-plans.schemas.js`)
- `createPlanSchema`
  - `weekStart` valid ISO date and must be a Monday
- `updateSlotSchema`
  - `mealId` positive integer or null
  - `notes` nullable/trimmed string
- `randomSlotSchema`
  - `favoritesOnly` strict booleanish, default `false`
  - `fullMatchOnly` strict booleanish, default `false`
  - `excludeServedWithinDays` integer 0..365, default `0`
  - `excludePlannedMeals` strict booleanish, default `true`
- `autofillSchema`
  - same as random slot minus `excludePlannedMeals`
- `dayParamSchema` — `day` integer 0..6
- `weeklyPlanIdParamSchema` — positive integer `id`
- `archivedPlansQuerySchema` — `limit` integer 1..100, default `10`

### Shared validation
- `src/lib/validation.js` provides the `validate()` middleware and `booleanish()` coercion helper.

## 6) Tests

### Unit tests
- `test/unit/ingredient-resolution.test.js`
  - dedupe/order behavior for ingredient resolution
  - optional sorting
  - 404 on missing ids
- `test/unit/shopping-list.service.test.js`
  - meal id dedupe
  - shopping list aggregation
  - optional inclusion behavior
- `test/unit/suggestions.service.test.js`
  - match sorting order
  - random picker exclusions
- `test/unit/validation.test.js`
  - booleanish coercion strict/non-strict behavior
- `test/unit/weekly-plans.repo.test.js`
  - migration application
  - plan creation/archiving/replacement
  - slot updates/served derivation/history linkage
  - source-plan copying/replacement
  - archived meal summary visibility
- `test/unit/weekly-plans.service.test.js`
  - plan reuse behavior
  - autofill cumulative exclusions and partial-failure handling

### Integration tests
- `test/integration/app.test.js`
  - health endpoint
  - meal CRUD/favorite/archive
  - pantry replacement/deletion
  - suggestions matching
  - shopping list generation and validation errors
  - random meal selection behaviors
  - weekly plan and history behavior
- `test/integration/import-export.test.js`
  - recipe export envelope and headers
  - recipe import success/duplicate/failure cases
  - catalog creation during import
- `test/integration/weekly-plans.test.js`
  - current plan missing behavior
  - create/reuse/archive flows
  - random slot, autofill, serve, clear, and notes behavior

### E2E / UI tests
- `e2e/tests/a11y.pw.js` — accessibility coverage
- `e2e/tests/clipboard.pw.js` — copy-to-clipboard flows
- `e2e/tests/interactions.pw.js` — UI interaction smoke coverage
- `e2e/tests/meals.pw.js` — meals tab workflows
- `e2e/tests/plan.pw.js` — plan workflows
- `e2e/tests/shop.pw.js` — shop/pantry workflows
- `e2e/tests/tabs.pw.js` — tab navigation/layout
- `e2e/tests/visual.pw.js` — visual regression coverage

### Test harness
- `test/helpers/test-app.js` creates isolated db/app contexts for tests.
- Playwright config lives in `e2e/playwright.config.js`.

## 7) Import/export functionality

### Existing recipe data import/export
- **Export endpoint:** `GET /api/meals/export`
  - emits the meal recipe envelope
  - excludes internal ids and timestamps
  - downloads as `recipes-YYYY-MM-DD.json`
- **Import endpoint:** `POST /api/meals/import`
  - accepts the same envelope
  - creates new catalog ingredients/tags as needed
  - skips duplicates by normalized meal name
  - reports validation failures per meal

### Copy/export text features
- Weekly plan text export/copy from the Plan tab.
- Archived plan copy from plan history detail.
- Shopping list plain-text copy, including combined plan + shopping list share pack.

### Non-file import-like behaviors
- Pantry and ingredient name entry can resolve ad hoc names into the catalog for matching/shopping.
- These are not bulk import/export paths, but they do create persistent catalog records in some flows.

## Migration notes for Expo/React Native
- The current app is a single-page, server-served web UI with three tabs and many inline workflows.
- The backend API surface is already fairly clean and can likely be reused as-is by a mobile client.
- The heaviest migration areas are the weekly-plan workflow, shopping-list copy/export, import/export, and all modal/prompt/clipboard interactions.
