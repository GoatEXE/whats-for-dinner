# Cleanup Backlog

Date: 2026-04-02 (updated 2026-04-08)
Status: all P1 and P2 items complete; remaining backlog is P3 polish only

## Priority Legend

- **P1 (must-fix):** Functional or accessibility issue that affects real usage
- **P2 (should-fix):** Consistency, maintainability, or UX rough edge worth addressing soon
- **P3 (nice-to-have):** Polish that improves quality but can wait

---

## P1 — Must-Fix

### ~~1. Status banner is not announced to screen readers~~ — **FIXED in v1.7**

**Resolution:** Added `role="status"` and `aria-live="polite"` to `#status-banner` in `public/index.html` (lines 26-27).

**Verification:** Screen readers now announce status messages after all actions.

---

### ~~2. Dynamically generated buttons and interactive elements lack accessible labels~~ — **FIXED**

**Resolution:** Added `aria-label` attributes with contextual information to all dynamic interactive elements:
- Meal card buttons include meal name (e.g., `aria-label="Edit Spaghetti Tacos"`)
- Plan slot controls include day context (e.g., `aria-label="Random meal for Monday"`)
- Shopping list chip remove buttons include meal name
- Plan slot meal picker dropdowns include day context

**Verification:** `public/renderers.js` (meal cards, shopping chips, random result), `public/plan-renderers.js` (plan slot controls), `public/meals.js` (`createIngredientRow` Remove button).

---

### ~~3. Plan slot notes input saves on every keystroke~~ — **FIXED**

**Resolution:** Implemented a 350ms debounce on notes input changes via `notesSaveTimer`. Notes save is automatically flushed before any plan mutation (autofill, slot assignment) to prevent race conditions. In-flight saves are tracked and awaited when needed.

**Verification:** `public/plan-workflow.js` (`flushPendingNoteSave()`, `savePlanSlotNotes()`, and `handleWeeklyPlanChange()` implement the debounce, flush-before-mutation, and in-flight save handling).

---

## P2 — Should-Fix

### ~~4. `booleanish` Zod helper is copy-pasted across 4 schema files~~ — **FIXED**

**Resolution:** Extracted `booleanish` into `src/lib/validation.js` and updated all four schema files to import from the shared module. The helper now includes an optional `strict` mode for enhanced validation control.

**Verification:** `src/lib/validation.js` (exports booleanish), `src/modules/meals/meals.schemas.js`, `src/modules/shopping-list/shopping-list.schemas.js`, `src/modules/suggestions/suggestions.schemas.js`, `src/modules/weekly-plans/weekly-plans.schemas.js` (all import from validation lib).

---

### ~~5. `resolveAvailableIngredients` is duplicated between suggestions and shopping-list services~~ — **FIXED**

**Resolution:** Extracted shared ingredient-resolution logic into `src/lib/ingredient-resolution.js`. Both services now import and use `resolveAvailableIngredients()` with different name-resolution callbacks (`ensureIngredients` for suggestions, `resolveIngredientsByNames` for shopping-list). Deduplication logic and output shape are now centralized.

**Verification:** `src/lib/ingredient-resolution.js` (shared module), `src/modules/suggestions/suggestions.service.js` and `src/modules/shopping-list/shopping-list.service.js` (both import and use shared function).

---

### ~~6. `app.js` monolith — 1,650-line single-file frontend~~ — **FIXED**

**Resolution:** Split the frontend into ES modules using `<script type="module">`, reducing `public/app.js` from the original 1,650+ line monolith to a 354-line orchestration/init entrypoint. The extracted modules now separate concerns by role:
- `state.js` — shared state object
- `elements.js` — DOM element references
- `helpers.js` — API utilities and shared helpers
- `renderers.js` — meals, pantry, history, shopping renderers
- `plan-renderers.js` — weekly plan and plan history rendering/formatting
- `suggestions.js` — quick picker and ingredient match flows
- `shopping.js` — shopping list selection/generation flows
- `meals.js` — meal editor, meal CRUD, pantry actions
- `plan-actions.js` — plan history expand/copy/reuse and new-week prompt flow
- `plan-workflow.js` — plan creation, slot assignment, random fill, serve, autofill, notes debounce
- `app.js` — top-level orchestration, cross-module bridge logic, and init/event wiring

**Verification:** `public/index.html` uses `<script type="module" src="/app.js">`; module files live under `public/`. `npm run lint`, `npm run typecheck`, `npm test` (48 passing), and `npm run test:ui` (19 passing, 1 skipped) all pass.

---

### ~~7. Mobile plan slot layout loses day↔meal↔action association~~ — **FIXED**

**Resolution:** Enhanced mobile plan-slot layout with improved visual grouping and spacing. Changes include increased gap between slots, adjusted padding, bolder day labels, and better button wrapping behavior to improve scanability in the stacked vertical layout.

**Verification:** `public/styles.css` (mobile breakpoint at line ~598, plan-slot styling at lines 643-679). UI smoke tests continue to pass (19 tests).

---

### ~~8. No keyboard shortcut or skip-link to navigate between major sections~~ — **FIXED in v1.7**

**Resolution:** Added `aria-label` to all `<section>` elements (e.g., "Quick picker", "Weekly plan", "Shopping list", "Pantry", "Ingredient matches", "Meal editor", "Meals", "Recent history"). Also added `aria-label="Main sections"` to the tab bar for landmark navigation.

**Verification:** `public/index.html` lines 75, 132, 147, 167, 207, 233, 274, 346. Screen reader users can now navigate by landmark.

---

### ~~9. Stale archived-plan list after creating a new week~~ — **FIXED**

**Resolution:** Removed redundant `renderWeeklyPlan()` calls from `createWeeklyPlan()` and `reusePlan()`. Both functions now update state, call `await loadData()` (which refreshes all data and re-renders all panels), then show status. This ensures archived plans are current before any rendering happens.

**Verification:** `public/plan-workflow.js` (`createWeeklyPlan()`) and `public/plan-actions.js` (`reusePlan()`) both call `await loadData()` after the API request so rendering happens from refreshed state.

---

## P3 — Nice-to-Have

### ~~10. Ingredient row "Remove" button has no accessible label~~ — **FIXED**

**Resolution:** Fixed as part of Item 2 (accessible labels on dynamic elements). The ingredient editor "Remove" button now includes contextual aria-label with the ingredient name (e.g., `aria-label="Remove Garlic"` or `aria-label="Remove ingredient"` for empty rows).

**Verification:** `public/meals.js` `createIngredientRow()` function — aria-label includes ingredient name context.

---

### 11. `notesSchema` in weekly-plans schemas could be shared

**Files:** `src/modules/weekly-plans/weekly-plans.schemas.js`, `src/modules/meals/meals.schemas.js`, `src/modules/pantry/pantry.schemas.js`, `src/lib/validation.js`

Current assessment: **defer for now.** Extracting only weekly-plans `notesSchema` would create a one-off abstraction with little payoff. The worthwhile future version is a broader shared nullable-trimmed-string helper in `src/lib/validation.js` that can also replace the equivalent trim-to-null logic already used in meals and pantry schemas.

**Estimated size:** XS

---

### 12. `window.confirm` / `window.prompt` for plan creation and archive are not testable

**Files:** `public/meals.js` (`archiveMeal`), `public/plan-actions.js` (`handleNewWeekPlan`, `reusePlan`)

Three flows still use `window.confirm` or `window.prompt`. These block the thread and are awkward to intercept in automated tests. This is only worth fixing if the frontend test suite expands beyond the current smoke coverage.

**Estimated size:** S

---

### ~~13. Header subtitle is stale~~ — **FIXED in v1.7**

**Resolution:** Updated subtitle to "Plan weekly dinners, track pantry staples, and generate shopping lists." This concisely reflects the app's current primary capabilities.

**Verification:** `public/index.html` lines 15-17.

---

## Recommended Next Chunks

~~**First chunk (Items 1 + 8 + 13)** — COMPLETED in v1.7~~
~~**Second chunk (Items 2 + 3)** — COMPLETED~~
~~**Third chunk (Item 4)** — COMPLETED~~
~~**Fourth chunk (Item 5)** — COMPLETED~~
~~**Fifth chunk (Item 7)** — COMPLETED~~
~~**Sixth chunk (Item 9)** — COMPLETED~~
~~**Seventh chunk (Item 6)** — COMPLETED~~

**All P1 items are now complete. All P2 items are now complete.** The remaining backlog is P3 (nice-to-have) polish only.

**Remaining P3 items:**
- Item 11 — Deferred: only worth doing as a broader shared nullable-trimmed-string helper across weekly plans, meals, and pantry
- Item 12 — Replace `window.confirm`/`window.prompt` with testable alternatives if frontend tests expand beyond the current smoke suite

**Next recommended chunk: Item 12** — replace blocking browser dialogs with testable in-app flows, but only if improving frontend testability is worth the extra UI work now.
