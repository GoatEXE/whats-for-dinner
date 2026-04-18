# Current Project Status

Last updated: 2026-04-18

## Current direction

- Primary runtime: Expo / React Native mobile app in `apps/mobile`
- Distribution status: Android internal testing is active, closed testing is next
- Legacy web app: frozen fallback only, offboarding is now in progress
- Cloud/Firebase work: deferred per current project decision

## Mobile scope shipped

The mobile app is now the main supported experience and includes:

- offline meal CRUD with favorites, archive, tags, notes, and prep time
- pantry/on-hand management
- pantry-aware suggestions and random meal picking
- weekly planning for this week and next week
- repeat-window random fill and per-day random assignment
- shopping list generation for the viewed week
- checkable buy-list items and names-only clipboard copy
- recipe JSON import/export
- recipe URL import on native mobile
- cookbook export/share
- dark mode with persisted System / Light / Dark preference
- Android share-intent routing in a custom dev build
- demo-data seeding and reset flow

## Quality snapshot

- Root tests: 121 passing
- Mobile tests: 70 passing
- Total: 191 passing
- Mobile typecheck: clean
- Android preview and production build pipeline: configured with EAS
- CI now treats mobile tests and mobile typecheck as required while legacy web UI coverage remains during transition

## Web offboarding status

Offboarding has started, but final removal has not.

Completed so far:

- mobile-first README rewrite
- documented web-to-mobile cutover path for current users
- repo status doc refreshed around the mobile-first direction
- root scripts switched to mobile-first defaults, with explicit `legacy:web:*` commands kept for fallback use
- CI shifted to mobile-required checks while retaining legacy web transition coverage
- legacy web app explicitly marked as fallback-only
- Phase 2 docs cleanup completed, with obsolete web-era planning docs removed from `docs/`

Not started intentionally:

- removal of `src/`, `public/`, Docker assets, or legacy tests
- CI removal of backend/Playwright jobs
- final web cutover tag

Why removal is still deferred:

- the offboarding plan calls for at least one stable Play testing cycle first
- the legacy web app is still useful as a migration bridge and rollback reference

## Current migration support

Supported today:

- export active meals from the legacy web app
- import that cookbook JSON into the mobile app

Not migrated today:

- pantry state
- weekly plans
- meal history
- archived meals unless they are made active before export

See `docs/web-to-mobile-cutover.md` for the exact migration steps.

## Immediate next steps

1. Finish the first Play testing cycle, then expand into closed testing
2. Validate the mobile install/update path with testers
3. Prepare the final legacy runtime/code removal slice now that docs cleanup is complete
4. After a stable tester cycle, remove legacy runtime code, legacy tests, and legacy deployment assets

## Active docs

Use these first:

- `README.md`
- `docs/current-scope-audit.md`
- `docs/DEMO.md`
- `docs/migration-plan.md`
- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`
- `docs/google-play-closed-testing-plan.md`

## Historical docs

Web-era design and implementation docs were removed during Phase 2 docs cleanup. If you need those old planning artifacts, use git history rather than treating them as active project guidance.
