# Current Mobile Scope Audit

Last updated: 2026-04-18

## Supported product

- Primary runtime: Expo / React Native mobile app in `apps/mobile`
- Distribution status: Android internal testing is active; closed testing is the next release milestone
- Legacy web app: frozen migration bridge only, not an active product direction
- Cloud/Firebase sync: deferred by current product decision

## Shipped mobile scope

The supported mobile experience now includes:

- offline meal CRUD with favorites, archive, tags, notes, and prep time
- pantry / on-hand management
- pantry-aware suggestions and random meal picking
- weekly planning for this week and next week
- repeat-window random fill and per-day random assignment
- shopping list generation for the viewed week
- checkable buy-list items and names-only clipboard copy
- recipe JSON import / export
- recipe URL import on native mobile
- cookbook export / share
- dark mode with persisted System / Light / Dark preference
- Android share-intent routing in a custom dev build
- demo-data seeding and reset flow

## Supported demo and validation paths

Use these in order of preference:

1. **Google Play internal testing build** — preferred for product demos and tester validation
2. **Expo Go on Android** — preferred local-development fallback for live device demos
3. **Android custom dev build** — only when validating native share-intent behavior

The Expo web preview still exists as an engineering convenience, but it is not the primary demo path and should not be treated as the supported product surface.

## Quality snapshot

- Root tests: 121 passing
- Mobile tests: 70 passing
- Total: 191 passing
- Mobile typecheck: clean
- Android release pipeline: configured with EAS
- CI emphasis: mobile tests and mobile typecheck are the required path during offboarding

## Deferred and remaining work

### Deferred

- Firebase auth and Firestore sync (Phase 4)
- cross-device backup / sync UX

### Remaining Phase 5 / cutover work

- final legacy-data migration runbook
- decision on whether pantry / history / weekly plans get a one-time migration path
- stable tester cycle through Play
- final legacy web runtime removal

## Migration support for legacy users

Supported today:

- export active meals from the legacy web app
- import that cookbook JSON into the mobile app

Not migrated today:

- pantry state
- weekly plans
- meal history
- archived meals unless they are made active before export

See `docs/web-to-mobile-cutover.md` for the exact transition steps.

## Web offboarding status

Completed:

- mobile-first README and root workflow updates
- cutover guide for existing web users
- mobile-focused current-status docs
- docs cleanup pass removing obsolete web-era planning docs

Still intentionally deferred:

- removal of `src/`, `public/`, Docker assets, and legacy tests
- final CI cleanup for retired web-only checks
- last web-supported tag / final cutover commit

## Active docs

Use these first:

- `README.md`
- `docs/current-plan.md`
- `docs/DEMO.md`
- `docs/migration-plan.md`
- `docs/phase5-plan.md`
- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`
- `docs/google-play-closed-testing-plan.md`

## Historical reference policy

Web-era design and implementation docs removed during offboarding should be retrieved from git history if needed. The remaining docs in `docs/` should describe the mobile-first repo state or an explicit transition path.
