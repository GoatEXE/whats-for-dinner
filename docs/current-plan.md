# Current Project Status

Last updated: 2026-04-08 (updated after cleanup backlog item 6 completion)

## What's Complete

### Shipped user-facing features (v1.1–v1.7)

- **V1.1 Shopping lists** — Generate combined lists from selected meals vs pantry; deduplicate shared ingredients; copy-friendly export
- **V1.2 Weekly planning** — 7-day meal plans with manual assignment, per-slot random fill, mark as served, plan history
- **V1.3 Plan reuse** — Copy past plans as starting points for new weeks
- **V1.4 Weekly plan copy** — Copy plan text to clipboard
- **V1.5 Weekly share pack** — Combined plan + shopping list copy in one action
- **V1.6 Weekly autofill** — Batch-fill empty plan slots with one click using configurable filters
- **V1.7 Tabbed layout** — Three-tab structure (Plan / Shop / Meals) with mobile bottom-bar and cross-tab navigation

### Test infrastructure (v1.8)

- **V1.8 UI test harness (WP1+WP2 + Tier 2 complete + Tier 3 complete + CI)** — Playwright smoke tests, interaction tests, and visual regression across desktop + mobile viewports, running in GitHub Actions CI
  - 7 test suites: tabs, meals, plan, shop, interactions, clipboard, visual (49 tests passing + 1 expected skip)
  - Tier 1 structural smoke: page shell, tab switching, panel rendering, mobile layout
  - Tier 2 interactions (complete): quick picker flow, archive meal dialog, new weekly plan dialog, meal creation via form, plan-to-shopping-list flow, clipboard copy
  - Tier 3 visual regression (complete): full-page screenshots for Meals tab (seeded), Shop tab (seeded), Plan tab (empty + populated states)
  - Desktop (1280×800) and mobile (375×812) viewport coverage
  - Screenshot regression baselines for tab bar shell and 8 full-page states (4 states × 2 viewports)
  - Test server fixture with seeded data
  - CI: GitHub Actions runs backend (48 tests) + UI (49 tests) on all pushes/PRs
  - Runs in ~9s locally via `npm run test:ui`

### Completed cleanup items

From `docs/cleanup-backlog.md`:

**All P1 and P2 items are now complete. All actionable P3 items are now complete.**

- **Item 1 (P1)** — Status banner screen reader support: added `role="status"` and `aria-live="polite"` to `#status-banner`
- **Item 2 (P1)** — Accessible labels on dynamic elements: added contextual `aria-label` to all meal card buttons, plan slot controls, and interactive elements
- **Item 3 (P1)** — Plan slot notes debounce: implemented 350ms debounce with flush-before-mutation and in-flight tracking
- **Item 4 (P2)** — Extract booleanish helper: moved shared Zod preprocessor to `src/lib/validation.js`, imported in all 4 schema files
- **Item 5 (P2)** — Extract ingredient-resolution logic: shared `resolveAvailableIngredients` now in `src/lib/ingredient-resolution.js`, used by both suggestions and shopping-list services
- **Item 6 (P2)** — Split app.js monolith: refactored 1,650-line file into 11 ES modules (state, elements, helpers, renderers, plan-renderers, meals, shopping, suggestions, plan-actions, plan-workflow, app)
- **Item 7 (P2)** — Mobile plan slot layout polish: improved spacing, visual grouping, and button wrapping in mobile view
- **Item 8 (P2)** — Section landmarks: added `aria-label` to all `<section>` elements for screen reader navigation
- **Item 9 (P2)** — Remove redundant pre-reload render: `createWeeklyPlan` and `reusePlan` now call `loadData()` before rendering/status
- **Item 10 (P3)** — Ingredient row Remove button accessible label: aria-label includes ingredient name context (fixed as part of Item 2)
- **Item 12 (P3)** — Replace blocking dialogs: implemented an accessible, focus-trapped, testable in-app dialog module (`dialog.js`) replacing all `window.confirm`/`window.prompt` calls
- **Item 13 (P3)** — Header subtitle: updated to mention weekly planning and shopping lists

### Fixed scope-audit gaps

From `docs/current-scope-audit.md`:

- **Bug #1** — Per-slot random now sends filters: `fillPlanSlotRandom` passes `state.weeklyAutofillOptions` to the backend
- **Risk #2** — Archived plans refresh after plan creation: `createWeeklyPlan` and `reusePlan` now call `loadData()` to refresh the past plans list

## What's In Progress

None — the remaining cleanup work is low-priority P3 polish only.

## What's Next

### Follow-up opportunities (not scheduled)

From the v1.8 spec:
- **Tier 2 interaction tests** — ✅ Complete. All key interaction flows covered.
- **Tier 3 visual regression** — ✅ Complete. All key tab states covered: Meals, Shop, Plan (empty + populated).
- **CI integration** — ✅ Complete. GitHub Actions runs both backend and UI tests on all pushes/PRs.
- **Cross-browser testing** — expand beyond Chromium-only to Firefox/WebKit (optional enhancement)
- **Accessibility auditing** — integrate `@axe-core/playwright` for automated a11y checks (optional enhancement)

The current test suite (49 tests: Tier 1 structural + Tier 2 interactions + Tier 3 visual, all complete) provides comprehensive coverage for layout, core interaction flows, and visual regression detection. All tests run automatically in CI. Cross-browser testing and accessibility auditing remain optional enhancements.

### Remaining cleanup backlog (from docs/cleanup-backlog.md)

**All P1 and P2 items complete. All actionable P3 items complete.**

**P3 (deferred):**
- Item 11 — Share `notesSchema` if notes fields proliferate across modules (intentionally deferred; currently only used in weekly-plans, minimal value to extract)

**Cleanup backlog is effectively complete.** Item 11 remains as a low-priority optimization that can be revisited if the need arises.

No blocking issues. The app is fully functional and tested:
- 48 passing backend tests (Vitest + Supertest)
- 49 passing UI tests (Playwright, desktop + mobile: Tier 1 smoke + Tier 2 interactions + Tier 3 visual, all complete)

## Current Scope Boundaries

**In scope:**
- Family-scale meal planning with weekly structure
- Pantry-aware suggestions and shopping list generation
- Mobile-friendly tabbed UI
- Accessibility fundamentals (screen reader support, keyboard nav)
- Lightweight automated smoke tests

**Out of scope (no current plans):**
- Multi-user / auth
- Quantity math / unit conversion
- Meal prep scheduling / batch cooking
- Recurring templates beyond plan reuse
- Calendar views beyond 7-day plans
- Third-party integrations (Google Docs export, recipe APIs, etc.)

## How to Navigate Project Docs

- `docs/current-plan.md` (this file) — overall status and what's next
- `docs/current-scope-audit.md` — completed scope verification with known gap tracking
- `docs/cleanup-backlog.md` — prioritized technical debt and polish tasks
- `docs/v1.1-*.md` through `docs/v1.8-*.md` — feature implementation specs (all shipped)
- `README.md` — user/developer-facing documentation of shipped capabilities
