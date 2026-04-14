# Web App Offboarding Plan

## Objective
Retire the legacy Node/Express + vanilla web app cleanly and leave the repo as a mobile-first Expo workspace with only active, relevant code, tooling, and documentation.

## Recommendation
Do not execute final removal until the mobile app has completed at least one stable Google Play testing cycle. The web app can stay as a fallback/reference until tester installs and core flows are validated.

## Current Repo State
The legacy web app is still represented in these areas:

- Runtime and API: `src/`
- Browser UI: `public/`
- Container deployment: `Dockerfile`, `docker-compose.yml`
- Root scripts: `package.json` still starts the Express server
- Web/backend tests: `test/`, `e2e/`
- Active docs still reference the web app, web architecture, and web-era milestones

The mobile app already covers the primary product direction, but legacy-user offboarding still needs a documented migration path.

## Phase 0, Cutover Decision
### Goals
- Set a formal retirement target for the web app
- Freeze net-new web-only feature work
- Decide what user data must migrate

### Decisions to make
- Meals-only migration via export/import, or a one-time migration for weekly plans/history too
- Whether the web app remains readable for a short grace period or is shut off immediately after cutover
- Whether old docs are deleted outright or moved to an archive folder

## Phase 1, User Migration and Offboarding
### Tasks
- Document the supported migration path from web to mobile
- At minimum, support meal library migration via cookbook export/import
- Explicitly call out what will not migrate unless extra tooling is built, especially weekly plans and history
- Prepare a short cutover guide for current users/testers
- Define the final supported web-app version/tag for rollback reference

### Acceptance criteria
- A user can follow one documented path to move into the mobile app
- Migration limitations are stated plainly

## Phase 2, Documentation Cleanup
### Tasks
- Rewrite `README.md` so the mobile app is the primary entry point
- Remove or rewrite web-first guidance in active docs
- Review and retire or archive these likely web-era docs:
  - `docs/architecture.md`
  - `docs/current-plan.md`
  - `docs/cleanup-backlog.md`
  - `docs/v1.1-shopping-list.md`
  - `docs/v1.2-weekly-planning.md`
  - `docs/v1.3-plan-reuse.md`
  - `docs/v1.4-weekly-plan-copy.md`
  - `docs/v1.5-weekly-share-pack.md`
  - `docs/v1.6-weekly-autofill.md`
  - `docs/v1.7-tabbed-layout.md`
  - `docs/v1.8-ui-test-harness.md`
- Update any remaining migration docs so they describe the mobile-first repo state

### Recommendation
Remove old docs from the active set unless there is a concrete operational reason to keep them. Git history is usually enough.

## Phase 3, Legacy Runtime Removal
### Tasks
- Remove legacy runtime and UI code:
  - `src/`
  - `public/`
- Remove legacy deployment assets if no longer needed:
  - `Dockerfile`
  - `docker-compose.yml`
- Remove root server-oriented scripts and dependencies from `package.json`
- Remove unused backend-only dependencies once the web app is gone

### Dependencies
- Complete Phase 1 first so users have an offboarding path
- Complete Phase 2 first so docs do not point at removed code

## Phase 4, Test and CI Cleanup
### Tasks
- Remove legacy backend and browser-E2E coverage that only validates the retired app:
  - `test/`
  - `e2e/`
- Replace CI with mobile/domain-focused checks
- Promote mobile checks from `continue-on-error` to required
- Decide whether root scripts remain as monorepo wrappers or move to workspace-specific commands

### Target CI after offboarding
- Root/domain tests
- Mobile typecheck
- Mobile tests
- Optional Android release/export smoke build

## Phase 5, Final Cutover
### Tasks
- Tag the last web-supported commit before removal
- Remove any final web references from README, docs, CI, and scripts
- Confirm a clean clone works as a mobile-first repo only
- Announce the cutover to testers/users

## Rollback Plan
- Keep a git tag for the final web-supported commit
- Keep the web export/import path documented until the offboarding window ends
- If mobile beta blocks adoption, rollback means reviving the tagged web commit rather than keeping both tracks half-maintained indefinitely

## Risks
- **No migration path for weekly plans/history**: users may lose context unless this is explicitly accepted
- **Docs drift**: stale web instructions can remain after code removal unless audited file-by-file
- **CI confusion**: partial cleanup can leave broken or irrelevant jobs behind
- **Tester disruption**: removing the web app before mobile distribution is stable increases support burden

## Exit Criteria
- No active doc tells users to run the Express app
- No CI job depends on `src/`, `public/`, Docker, or Playwright web flows
- Root scripts no longer represent the retired web app
- Mobile is the only supported runtime in the repo
- Users have a documented migration/offboarding path

## Recommended Order
1. Google Play testing plan and first tester cycle
2. User migration/offboarding path
3. Docs cleanup
4. Code/runtime removal
5. CI/tooling cleanup
6. Final cutover tag and announcement
