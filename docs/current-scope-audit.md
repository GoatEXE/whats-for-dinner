# Current Scope Audit

Date: 2026-04-02 (updated 2026-04-07)

## Verdict

The scoped roadmap in `docs/v1.1-*` through `docs/v1.6-*` is **fully landed** in the current codebase. The backend and frontend both implement shopping lists, weekly planning, plan reuse, plan copy, combined plan/share copy, and weekly autofill.

**V1.7 (tabbed layout)** is also complete as of 2026-04-07.

All previously identified gaps have been resolved:
- ✅ Per-slot random fill now sends filters (fixed in v1.7)
- ✅ Archived plans refresh after plan creation (fixed in v1.7)
- ✅ README updated to document weekly-plan scope (fixed 2026-04-07)

## Priority Findings (All Resolved)

### ~~bug~~ FIXED

1. **~~Per-slot Random ignores the documented plan/random filters in the UI~~** — **FIXED in v1.7**
   - **Resolution:** `fillPlanSlotRandom` now sends `state.weeklyAutofillOptions` (which includes `favoritesOnly`, `fullMatchOnly`, `excludeServedWithinDays`) to the backend. The autofill UI also exposes these filter controls.
   - **Verification:** `public/app.js` line ~1018 shows `body: JSON.stringify(state.weeklyAutofillOptions)`

### ~~risk~~ FIXED

2. **~~Creating a new week does not refresh the Past plans list after the old active plan is archived~~** — **FIXED in v1.7**
   - **Resolution:** `createWeeklyPlan()` and `reusePlan()` now call `await loadData()` after plan creation, which refreshes `state.archivedPlans` and rerenders the history panel.
   - **Verification:** `public/app.js` line ~981 shows `await loadData()` after plan creation

3. **~~README is stale versus the implemented scope~~** — **FIXED 2026-04-07**
   - **Resolution:** README now documents weekly planning, shopping lists, plan sharing, and the full `/api/weekly-plans/*` endpoint set. Features section expanded, API overview reorganized by domain, and weekly planning workflow added.
   - **Verification:** `README.md` lines 10–19 (features), lines 89–117 (API overview)

## Feature Matrix

| Feature / slice | Expected capability | Status | Evidence paths |
|---|---|---|---|
| V1.1 Shopping list | Generate combined shopping list from selected meals vs pantry/ad hoc on-hand inputs; dedupe shared ingredients; copy-friendly text; frontend selection/copy flow | **landed** | `src/modules/shopping-list/shopping-list.routes.js`, `src/modules/shopping-list/shopping-list.service.js`, `public/index.html`, `public/app.js`, `test/unit/shopping-list.service.test.js`, `test/integration/app.test.js` |
| V1.2 Weekly planning | Active weekly plan with 7 slots, create/current/history/detail APIs, assign/clear/serve, frontend panel, plan-to-shopping-list flow | **landed** | `src/db/migrations/002_weekly_plans.sql`, `src/modules/weekly-plans/weekly-plans.routes.js`, `src/modules/weekly-plans/weekly-plans.service.js`, `src/modules/weekly-plans/weekly-plans.repo.js`, `public/app.js`, `public/index.html`, `test/integration/weekly-plans.test.js` |
| V1.2 per-slot random filters | Slot-level random fill should respect favorites/full-match/recent-history filters | **landed** | `docs/v1.2-weekly-planning.md`, `src/modules/weekly-plans/weekly-plans.schemas.js`, `src/modules/weekly-plans/weekly-plans.service.js`, `public/app.js` |
| V1.3 Plan reuse | Reuse archived plan into a new week, copy meals/notes, archive displaced active plan, frontend action from past plans | **landed** | `src/modules/weekly-plans/weekly-plans.routes.js`, `src/modules/weekly-plans/weekly-plans.service.js`, `src/modules/weekly-plans/weekly-plans.repo.js`, `public/app.js`, `test/integration/weekly-plans.test.js`, `test/unit/weekly-plans.service.test.js` |
| V1.4 Weekly plan copy | Copy active weekly plan as plain text | **landed** | `public/app.js` (`formatWeeklyPlanText`, `copyWeeklyPlan`, render action), `test/integration/weekly-plans.test.js` (plan data shape coverage) |
| V1.5 Weekly share pack | Copy plan + freshly generated shopping list in one combined clipboard action; update shopping-list panel state too | **landed** | `public/app.js` (`copyPlanAndShoppingList`, `generateShoppingListForCurrentPlan`, weekly plan footer rendering) |
| V1.6 Weekly autofill | Backend batch autofill of empty slots with summary metadata; frontend button and status handling; preserve existing assignments/notes | **landed** | `src/modules/weekly-plans/weekly-plans.routes.js`, `src/modules/weekly-plans/weekly-plans.service.js`, `src/modules/weekly-plans/weekly-plans.schemas.js`, `public/app.js`, `test/integration/weekly-plans.test.js`, `test/unit/weekly-plans.service.test.js` |
| V1.7 Tabbed layout | Three-tab structure (Plan/Shop/Meals) with mobile bottom-bar, cross-tab navigation, accessibility landmarks | **landed** | `public/index.html`, `public/app.js`, `public/styles.css` |
| README / repo-level contract alignment | Top-level docs should reflect current scope and available APIs | **landed** | `README.md`, `src/modules/weekly-plans/*`, `public/app.js`, `test/integration/weekly-plans.test.js` |

## ~~Scope Gaps to Fix Before Cleanup~~ — All Resolved

~~1. Wire per-slot random filters in the weekly-plan UI~~ — **FIXED in v1.7**
~~2. Refresh Past plans after creating/replacing a weekly plan~~ — **FIXED in v1.7**
~~3. Update `README.md`~~ — **FIXED 2026-04-07**

## Not Scope Gaps / Nice-to-Have Polish

- Archived plan copy support exists in the UI even though `docs/v1.4-weekly-plan-copy.md` scoped copy primarily around the active plan. This is additive, not a scope problem.
- The codebase has stronger test coverage for weekly planning than the docs strictly require (`test/integration/weekly-plans.test.js`, `test/unit/weekly-plans.*.test.js`).
- `docs/architecture.md` is an initial proposal, not a strict feature checklist. The important current-scope slices are the v1.1-v1.6 docs, which are mostly implemented.

## Validation Run

- Inspected repo docs and implementation under `README.md`, `docs/`, `src/`, and `public/`
- Ran test suite: `npm test` → **42 tests passed**
