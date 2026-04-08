# Current Project Status

Last updated: 2026-04-07 (updated after v1.8 WP2 completion)

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

- **V1.8 UI test harness (WP1+WP2)** — Playwright smoke tests covering structural rendering and tab switching across desktop + mobile viewports
  - 4 test suites: tabs, meals, plan, shop (19 tests passing)
  - Desktop (1280×800) and mobile (375×812) viewport coverage
  - Screenshot regression baselines for tab bar shell
  - Test server fixture with seeded data
  - Runs in ~4s via `npm run test:ui`

### Completed cleanup items

From `docs/cleanup-backlog.md`:

- **Item 1 (P1)** — Status banner screen reader support: added `role="status"` and `aria-live="polite"` to `#status-banner`
- **Item 8 (P2)** — Section landmarks: added `aria-label` to all `<section>` elements for screen reader navigation
- **Item 13 (P3)** — Header subtitle: updated to mention weekly planning and shopping lists

### Fixed scope-audit gaps

From `docs/current-scope-audit.md`:

- **Bug #1** — Per-slot random now sends filters: `fillPlanSlotRandom` passes `state.weeklyAutofillOptions` to the backend
- **Risk #2** — Archived plans refresh after plan creation: `createWeeklyPlan` and `reusePlan` now call `loadData()` to refresh the past plans list

## What's In Progress

None — no active worker tasks at this time.

## What's Next

### Follow-up opportunities (not scheduled)

From the v1.8 spec (intentionally deferred):
- **Tier 2 interaction tests** — meal creation via form, quick picker, plan-to-shopping-list flow, clipboard copy
- **Tier 3 visual regression** — full-page screenshots at each tab × viewport for diff comparison
- **CI integration** — add `npm run test:ui` to GitHub Actions or similar pipeline

These are optional enhancements. The current Tier 1 smoke suite (19 tests) provides the intended safety net for layout changes.

### Remaining cleanup backlog (from docs/cleanup-backlog.md)

**P1 (must-fix):**
- Item 2 — Accessible labels on dynamic elements (meal card buttons, plan slot controls)
- Item 3 — Plan slot notes input debounce or blur-only save

**P2 (should-fix):**
- Item 4 — Extract duplicated `booleanish` helper to shared module
- Item 5 — Extract duplicated `resolveAvailableIngredients` to shared module
- Item 6 — Split `app.js` monolith into ES modules
- Item 7 — Mobile plan slot layout polish
- Item 9 — Remove redundant pre-reload render in plan creation (cosmetic timing issue)

**P3 (nice-to-have):**
- Items 10–12 — Minor polish (ingredient row labels, shared notes schema, testable prompts/confirms)

No blocking issues. The app is fully functional and tested:
- 42 passing backend tests (Vitest + Supertest)
- 19 passing UI smoke tests (Playwright, desktop + mobile)

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
