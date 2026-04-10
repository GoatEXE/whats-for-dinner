# Phase 2 Mobile Scaffolding Audit

Audit date: 2026-04-10

## 1) Mobile repos (`apps/mobile/src/db/repos/`)

### Real implementations
- `history-repo.ts` — real DB-backed implementation.
  - Reads/writes `meal_history` and joins `meals` for meal name / favorite flag.
  - Functions: `record`, `getRecent`, `getByMeal`, `getAll`.
- `ingredients-repo.ts` — real implementation.
  - `getOrCreate`, `getAll`, `search`.
  - Handles soft-delete resurrection (`deleted_at = NULL`) and normalization.
- `meals-repo.ts` — real implementation.
  - Full CRUD-ish flow: create/update/archive/favorite/delete/search/getById.
  - Manages `meal_ingredients` and `meal_tags` relationship rows.
- `pantry-repo.ts` — real implementation.
  - `getAll`, `addItem`, `removeItem`, `isOnHand`, `bulkSet`.
- `tags-repo.ts` — real implementation.
  - `getOrCreate`, `getAll`.

### Weekly-plans repo
- **No weekly-plans repo exists** in `apps/mobile/src/db/repos/`.
- Only `.gitkeep` plus the above 5 repos are present.
- This is a clear gap because the DB schema already contains `weekly_plans` and `weekly_plan_slots`.

### Migration tables in `apps/mobile/src/db/migrations/001-initial.ts`
Tables created:
- `ingredients`
- `tags`
- `meals`
- `meal_ingredients`
- `meal_tags`
- `pantry_items`
- `meal_history`
- `weekly_plans`
- `weekly_plan_slots`

Also present:
- indexes for meals, ingredients, tags, pantry, history, weekly plans, and weekly plan slots
- triggers to keep `updated_at` fresh on `ingredients`, `tags`, `meals`, and `weekly_plans`

## 2) Mobile hooks (`apps/mobile/src/hooks/`)

### Real implementations
- `useDatabase.tsx` — real database provider/context wrapper.
  - Initializes DB via `initializeDatabase()`.
- `useMeals.ts` — real implementation.
  - Uses `meals-repo` and maps DB records to UI model.
  - Supports refresh/search/create/update/archive/favorite/delete/getById.
- `usePantry.ts` — real implementation.
  - Wraps pantry repo and exposes add/remove/bulkSet/isOnHand.
- `useHistory.ts` — real implementation.
  - Wraps history repo, exposes record/getByMeal/getAll/getRecentMealIds.

### Stub / placeholder
- `useWeeklyPlan.ts` — **stubbed placeholder**.
  - Top comment: `// TODO: replace with real DB-backed weekly-plan repo in a later phase.`
  - Uses in-memory `MOCK_PLAN` instead of DB.
  - `refresh()` and `autofill()` are TODO/no-op implementations.
  - `assignSlot()` / `clearSlot()` only mutate local React state.
  - `getPlannedMealIds()` is local-state only.

### Missing hook support
- No DB-backed weekly-plan hook exists yet.
- No hook appears to consume a weekly-plan repo, because that repo is missing.

## 3) Mobile screens (`apps/mobile/app/(tabs)/`)

### Implemented
- `_layout.tsx` — real tab navigator shell.
  - Defines tabs for `plan`, `shop`, and `meals`.
  - Uses Expo Router + Ionicons.

### Missing / incomplete
- No actual screen files were found under `apps/mobile/app/(tabs)/` besides `_layout.tsx`.
- Missing tab route files likely include:
  - `apps/mobile/app/(tabs)/plan.tsx`
  - `apps/mobile/app/(tabs)/shop.tsx`
  - `apps/mobile/app/(tabs)/meals.tsx`
- Result: the tab shell exists, but the tab screens themselves are not implemented in this directory.

## 4) Mobile UI components (`apps/mobile/src/ui/`)

### Real implementations
These are functional UI components, not stubs:
- `ConfirmDialog.tsx`
- `EmptyState.tsx`
- `FAB.tsx`
- `IngredientRow.tsx`
- `MealCard.tsx`
- `MealPickerModal.tsx`
- `RandomPickerModal.tsx`
- `SearchBar.tsx`
- `TagChip.tsx`
- `theme.ts`
- `index.ts`

### Notes / minor gaps
- No obvious placeholder component bodies were found.
- `RandomPickerModal.tsx` is wired to the random picker feature and is not a stub, but the file was not fully inspected past the first chunk; no TODO/stub markers were visible in the portion read.
- `ConfirmDialog` and modal components are real UI, though not necessarily connected to a completed screen flow yet.

## 5) Mobile features (`apps/mobile/src/features/`)

### Real implementations
- `features/meals/useMealForm.ts` — real form-state helper.
  - Handles ingredient/tag editing, validation, reset, payload conversion.
- `features/meals/useRandomPicker.ts` — real implementation.
  - Adapts mobile meals/pantry into domain random-picker inputs and exposes `roll/accept/clear`.
- `features/shopping/useShoppingList.ts` — real implementation.
  - Wraps domain `buildShoppingList()` with mobile type adapters.
- `features/suggestions/useSuggestions.ts` — real implementation.
  - Wraps domain `findMatches()` with mobile type adapters.

### Stub / placeholder directories
These feature areas currently contain only `.gitkeep` placeholders and no code:
- `features/history/`
- `features/import/`
- `features/meals/` has code, but only the two hooks above; no broader meal feature flows
- `features/pantry/`
- `features/plans/`
- `features/shopping/` has code, but no additional feature modules
- `features/suggestions/` has code, but no additional feature modules
- `features/sync/`

### Main feature gap
- There is **no plans feature implementation** yet, despite a weekly plan concept existing in the DB schema and hook scaffolding.

## 6) Domain package gaps (`packages/domain/`)

### `src/weekly-plans.ts`
#### Logic present
- Defines weekly-plan types and helpers:
  - `WeeklyPlanMeal`, `WeeklyPlanSlot`, `WeeklyPlan`, `UpdateSlotData`, `RandomSlotFilters`, `AutofillFilters`
- Implements:
  - `getCurrentSlot`
  - `listPlannedMealIds`
  - `resolveUpdatedSlotValues`
  - `applySlotUpdate`
  - `getRandomSlotExcludeMealIds`
  - `fillSlotRandom`
  - `autofillEmptySlots`

#### Behavior notes
- Uses `HttpError(404, ...)` when slots/meals are missing or when no random candidates remain.
- `autofillEmptySlots` walks empty slots in day order and stops early when random picking exhausts candidates.
- This file is substantive, not a stub.

#### Test coverage gap
- **No corresponding test file was found** under `packages/domain/tests/` for weekly-plans logic.
- Existing tests cover other domain modules, but not this one.

### `src/random-picker.ts`
#### Logic present
- Defines `RandomPickerFilters` and `ListRandomMealCandidatesInput`.
- Implements:
  - `listRandomMealCandidates`
  - `pickRandomMeal`
- Filtering includes:
  - favorites-only
  - recent meal exclusion
  - explicit excluded meal IDs
  - full-match filtering via `findMatches()` when requested
- Throws `HttpError(404, ...)` if no candidates remain.

#### Test coverage gap
- **No corresponding test file was found** under `packages/domain/tests/` for random-picker logic.
- Existing tests do not appear to cover this file directly.

## Summary of highest-risk gaps
1. Missing DB-backed weekly-plans repo in mobile.
2. `useWeeklyPlan.ts` is still a mock/in-memory placeholder.
3. No actual tab screen files under `apps/mobile/app/(tabs)/` beyond the shell layout.
4. Domain weekly-plans and random-picker logic exist, but lack direct tests.
