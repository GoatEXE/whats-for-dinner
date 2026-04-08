# Cleanup Backlog

Date: 2026-04-02 (updated 2026-04-07)
Status: partially complete — items 1, 8, and 13 shipped in v1.7

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

**Verification:** `public/app.js` lines 248-252 (meal cards), 916-941 (plan slots), 353 (shopping chips), 486-487 (random result).

---

### ~~3. Plan slot notes input saves on every keystroke~~ — **FIXED**

**Resolution:** Implemented a 350ms debounce on notes input changes via `notesSaveTimer`. Notes save is automatically flushed before any plan mutation (autofill, slot assignment) to prevent race conditions. In-flight saves are tracked and awaited when needed.

**Verification:** `public/app.js` lines 1192-1203 (debounce setup and flush), lines 1327-1331 (debounce trigger on input change).

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

### 6. `app.js` monolith — 1,650-line single-file frontend

**Files:** `public/app.js`

The entire frontend is one file with ~1,650 lines covering state management, API calls, DOM rendering, event delegation, and business logic for 8+ features. It follows clean function-per-concern patterns internally but has no module boundaries.

This is not blocking, but it increases the cost of every future change and makes it hard to test any frontend logic in isolation.

**Fix (incremental):** Split into logical modules using ES modules (`<script type="module">`):
- `api.js` — `apiFetch`, `fetchCurrentPlan`
- `state.js` — shared state object
- `render/meals.js`, `render/weekly-plan.js`, `render/shopping-list.js`, etc.
- `app.js` — init + event wiring

This can be done one module at a time without a build step.

**Estimated size:** M (create 4–6 new files, refactor imports)

---

### ~~7. Mobile plan slot layout loses day↔meal↔action association~~ — **FIXED**

**Resolution:** Enhanced mobile plan-slot layout with improved visual grouping and spacing. Changes include increased gap between slots, adjusted padding, bolder day labels, and better button wrapping behavior to improve scanability in the stacked vertical layout.

**Verification:** `public/styles.css` (mobile breakpoint at line ~598, plan-slot styling at lines 643-679). UI smoke tests continue to pass (19 tests).

---

### ~~8. No keyboard shortcut or skip-link to navigate between major sections~~ — **FIXED in v1.7**

**Resolution:** Added `aria-label` to all `<section>` elements (e.g., "Quick picker", "Weekly plan", "Shopping list", "Pantry", "Ingredient matches", "Meal editor", "Meals", "Recent history"). Also added `aria-label="Main sections"` to the tab bar for landmark navigation.

**Verification:** `public/index.html` lines 75, 132, 147, 167, 207, 233, 274, 346. Screen reader users can now navigate by landmark.

---

### 9. Stale archived-plan list after creating a new week (known audit gap)

**Files:** `public/app.js` (`createWeeklyPlan`, `reusePlan`)

Already documented in `docs/current-scope-audit.md` (risk #2). When a new plan is created, the old plan is archived server-side but `state.archivedPlans` is stale until full reload. The current code calls `await loadData()` after `renderWeeklyPlan()`, which does refresh — but the initial `renderWeeklyPlan()` call and status message happen before the reload completes, creating a brief inconsistency.

**Fix:** Remove the redundant pre-reload render: just `await loadData()` first, then `showStatus(...)`. Or accept the current behavior since `loadData()` follows immediately.

**Estimated size:** XS (1 file, reorder 2–3 lines)

---

## P3 — Nice-to-Have

### 10. Ingredient row "Remove" button has no accessible label

**Files:** `public/app.js` (`createIngredientRow`)

The dynamically created "Remove" button in the ingredient editor has no `aria-label`. When there are multiple ingredient rows, screen readers cannot distinguish which row each "Remove" button belongs to.

**Estimated size:** XS

---

### 11. `notesSchema` in weekly-plans schemas could be shared

**Files:** `src/modules/weekly-plans/weekly-plans.schemas.js`

The `notesSchema` (string-or-null with trim transform) is specific to weekly plans currently but could be reused if notes fields appear elsewhere. Low priority since it's only used in one place today.

**Estimated size:** XS

---

### 12. `window.confirm` / `window.prompt` for plan creation and archive are not testable

**Files:** `public/app.js` (`archiveMeal`, `handleNewWeekPlan`, `reusePlan`)

Three flows use `window.confirm` or `window.prompt`. These block the thread and are impossible to intercept in automated tests. This is a known limitation of the vanilla-JS approach and only worth fixing if frontend tests are added.

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

**All P1 items are now complete.** The remaining backlog is P2 (should-fix) and P3 (nice-to-have) polish.

**Next recommended chunk: Item 9** — Remove redundant pre-reload render in plan creation.
