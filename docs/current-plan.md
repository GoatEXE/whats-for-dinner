# Current Project Status

Last updated: 2026-04-18

## Current direction

- Primary runtime: Expo / React Native mobile app in `apps/mobile`
- Distribution status: Android internal testing is active, closed testing is next
- Repo state: mobile-only workspace with shared packages in `packages/domain` and `packages/contracts`
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

- Domain tests: 62 passing
- Mobile tests: 70 passing
- Total: 132 passing
- Root/shared typecheck: clean
- Mobile typecheck: clean
- Android preview and production build pipeline: configured with EAS
- CI emphasis: domain and mobile checks are the active validation path

## Web offboarding status

Web offboarding is complete.

Completed work:

- removed the legacy runtime, browser UI, Docker assets, and web-only tests from the repo
- simplified root scripts to mobile-first defaults with no legacy web commands
- cleaned up active docs around the mobile-only workspace state
- retained historical cutover/offboarding docs only as reference material
- kept recipe import/export compatibility for historical cookbook JSON exports

## Historical import compatibility

If you already have a cookbook JSON export from a legacy web-app checkout, the mobile app still imports it.

Not covered by that historical export path:

- pantry state
- weekly plans
- meal history
- archived meals unless they were made active before export

See `docs/web-to-mobile-cutover.md` for the historical cutover details.

## Immediate next steps

1. Finish the current Play internal-testing cycle and expand into closed testing
2. Validate the install/update path with testers on real devices
3. Decide which deferred Phase 5 follow-ups are worth shipping next
4. Keep the mobile demo and release docs aligned with the shipped app surface

## Active docs

Use these first:

- `README.md`
- `docs/current-scope-audit.md`
- `docs/DEMO.md`
- `docs/migration-plan.md`
- `docs/phase5-plan.md`
- `docs/google-play-closed-testing-plan.md`

## Historical docs

These docs still exist in `docs/`, but they are historical reference rather than current workflow guidance:

- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`
