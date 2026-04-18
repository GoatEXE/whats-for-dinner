# Current Mobile Scope Audit

Last updated: 2026-04-18

## Supported product

- Primary runtime: Expo / React Native mobile app in `apps/mobile`
- Distribution status: Android internal testing is active; closed testing is the next release milestone
- Repo state: mobile-only workspace with shared packages in `packages/domain` and `packages/contracts`
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

- Domain tests: 62 passing
- Mobile tests: 70 passing
- Total: 132 passing
- Root/shared typecheck: clean
- Mobile typecheck: clean
- Android release pipeline: configured with EAS
- CI emphasis: domain and mobile checks are the required validation path

## Deferred and remaining work

### Deferred

- Firebase auth and Firestore sync (Phase 4)
- cross-device backup / sync UX

### Remaining Phase 5 / release work

- stable tester cycle through Play
- closed-testing rollout and release QA follow-through
- decision on any post-Phase-5 cookbook export enhancements
- decision on whether broader historical migration tooling is still worth building

## Historical import support

If you already have a cookbook JSON export from a legacy web-app checkout, the mobile app still imports it.

That historical path does not cover:

- pantry state
- weekly plans
- meal history
- archived meals unless they were made active before export

See `docs/web-to-mobile-cutover.md` for the exact historical transition steps.

## Web offboarding status

Completed:

- removed the legacy runtime, browser UI, Docker assets, and web-only tests
- simplified scripts and CI around the mobile-only workspace
- preserved cutover/offboarding docs only as historical reference
- kept cookbook JSON import compatibility for historical exports

## Active docs

Use these first:

- `README.md`
- `docs/current-plan.md`
- `docs/DEMO.md`
- `docs/migration-plan.md`
- `docs/phase5-plan.md`
- `docs/google-play-closed-testing-plan.md`

## Historical docs

These docs remain available as reference only:

- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`

## Historical reference policy

Web-era design and implementation docs removed during offboarding should be retrieved from git history if needed. The remaining docs in `docs/` describe either the current mobile-only repo state or a clearly labeled historical transition path.
