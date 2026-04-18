# What's for Dinner

What's for Dinner is a mobile-first meal planning app built with Expo, React Native, and local SQLite. The Android app is now the primary product direction. The legacy Node/Express web app remains in the repo as a temporary fallback while offboarding work is in progress.

## Current status

- Primary runtime: `apps/mobile`
- Android distribution: internal testing is active, closed testing is next
- Legacy web app: frozen, no net-new feature work, retirement plan in `docs/web-offboarding-plan.md`
- Cloud sync/auth: deferred for now

## Primary quick start

### Browser preview (fastest, ephemeral)

```bash
npm install
npm run mobile:web
```

Opens at http://localhost:8081.

Notes:

- Uses sql.js with an in-memory database
- Data resets on page refresh
- Good for walkthroughs, screenshots, and quick UI checks

### Android device with Expo Go (persistent local storage)

```bash
npm install
npm run mobile:start
```

If LAN discovery is flaky, retry from `apps/mobile` with:

```bash
cd apps/mobile
npx expo start --go --tunnel --clear
```

### Android release/testing builds

```bash
cd apps/mobile
npm run build:preview
npm run build:production
```

Helpful root wrappers for day-to-day work:

```bash
npm run mobile:start
npm run mobile:web
npm run mobile:test
npm run mobile:typecheck
npm run mobile:lint
```

- `build:preview` produces an installable internal-testing APK
- `build:production` produces the Play-uploadable AAB

## Mobile feature set

The mobile app currently supports:

- offline meal library management
- pantry/on-hand tracking
- pantry-aware suggestions and random meal picking
- weekly planning for this week and next week
- random fill with repeat-window controls
- shopping list generation with checkable buy-list items and names-only clipboard copy
- recipe JSON import/export
- recipe URL import on native mobile
- cookbook export/share
- dark mode with persisted System / Light / Dark preference
- Android share-intent routing in a custom dev build

## Testing and verification

Current verified counts:

- Root tests: 121 passing
- Mobile tests: 70 passing
- Total: 191 passing
- Mobile typecheck: clean

Useful commands:

```bash
npm run mobile:typecheck
npm run mobile:test
cd apps/mobile && npx expo export --platform android --output-dir dist-check
```

## Web to mobile migration

The currently supported migration path is meal-library export/import.

What moves today:

- meals
- ingredients
- tags
- prep time
- notes
- favorite state

What does not move today:

- pantry state
- weekly plans
- meal history
- archived meals that are still archived at export time

See `docs/web-to-mobile-cutover.md` for the full cutover steps.

## Repo layout

```text
apps/mobile/         Expo / React Native app, active runtime
packages/domain/     Shared business logic
packages/contracts/  Shared Zod schemas and portable envelope types
src/                 Legacy Express runtime, pending retirement
public/              Legacy web UI, pending retirement
docs/                Active plans, demo docs, and offboarding docs
```

## Legacy web app fallback (deprecated)

The legacy web app is still available as a temporary migration bridge while Play testing stabilizes.

```bash
npm install
npm run legacy:web:start
```

Open http://localhost:3000.

Current policy for the legacy web app:

- fallback and migration bridge only
- no net-new feature work
- final runtime removal deferred until the mobile testing cycle is stable

## Helpful docs

- `docs/DEMO.md`
- `docs/migration-plan.md`
- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`
- `docs/google-play-closed-testing-plan.md`
