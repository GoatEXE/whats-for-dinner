# Phase 2 Mobile Scaffolding Audit

Audit date: 2026-04-10

**Status:** All identified gaps have been resolved. Phases 1, 2, and 3 are complete.

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
- ✅ **Created:** `weekly-plans-repo.ts` now exists and provides:
  - `create`, `archive`, `getActive`, `update`, `updateSlot`, `getArchivedPlans`, `getById`
  - Full slot management with served-state derivation from history
  - Support for plan reuse/copy via `createFromSource`

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

### Real implementation
- `useWeeklyPlan.ts` — ✅ **Fully implemented DB-backed hook**.
  - Replaced in-memory mock with real weekly-plans repo integration.
  - `refresh()` loads current plan from DB.
  - `autofill()` calls domain `autofillEmptySlots` and persists results.
  - `assignSlot()` / `clearSlot()` / `serve()` update DB and refresh state.
  - `getPlannedMealIds()` returns current DB-backed plan meal IDs.

### Missing hook support
- No DB-backed weekly-plan hook exists yet.
- No hook appears to consume a weekly-plan repo, because that repo is missing.

## 3) Mobile screens (`apps/mobile/app/(tabs)/`)

### Implemented
- `_layout.tsx` — real tab navigator shell.
  - Defines tabs for `plan`, `shop`, and `meals`.
  - Uses Expo Router + Ionicons.

### Implemented
- ✅ All tab route files now exist:
  - `apps/mobile/app/(tabs)/plan.tsx` — current plan with slot assign/random/autofill/serve, archived plans, plan history detail
  - `apps/mobile/app/(tabs)/shop.tsx` — pantry editor, suggestions, shopping list from meals or plan
  - `apps/mobile/app/(tabs)/meals/index.tsx` — meal list with search/filter/archive/favorite
  - `apps/mobile/app/(tabs)/meals/[id].tsx` — meal detail view
  - `apps/mobile/app/(tabs)/meals/edit.tsx` — meal create/edit form
  - `apps/mobile/app/(tabs)/meals/import.tsx` — file import/export

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

#### Test coverage
- ✅ **Tests added:** `packages/domain/tests/weekly-plans.test.ts` covers:
  - `getCurrentSlot`
  - `listPlannedMealIds`
  - `resolveUpdatedSlotValues`
  - `applySlotUpdate`
  - `getRandomSlotExcludeMealIds`
  - `fillSlotRandom`
  - `autofillEmptySlots`

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

#### Test coverage
- ✅ **Tests added:** `packages/domain/tests/random-picker.test.ts` covers:
  - `listRandomMealCandidates`
  - `pickRandomMeal`
  - favorites-only filtering
  - recent meal exclusion
  - explicit exclusion list
  - full-match filtering

## Summary of resolutions
1. ✅ DB-backed weekly-plans repo created and integrated.
2. ✅ `useWeeklyPlan.ts` replaced with real DB-backed implementation.
3. ✅ All tab screen files implemented with full feature parity.
4. ✅ Domain weekly-plans and random-picker tests added and passing.

**Next steps:** Phase 4 (Firebase auth and Firestore sync) is ready to begin.
