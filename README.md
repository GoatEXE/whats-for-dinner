# What's for Dinner

What's for Dinner is a meal planning app built with Expo, React Native, and local SQLite. The active app lives in `apps/mobile`, with shared business logic in `packages/domain` and shared schemas in `packages/contracts`.

## Quick start

### Preferred: Android app

Use the installed Android build from Google Play internal testing when you want the most realistic app experience.

### Local fallback: Android device with Expo Go

```bash
npm install
npm start
```

`npm start` and `npm run dev` both launch the Expo mobile app from `apps/mobile`.

If LAN discovery is flaky, retry from `apps/mobile` with:

```bash
cd apps/mobile
npx expo start --go --tunnel --clear
```

### Android build commands

```bash
cd apps/mobile
npm run build:preview
npm run build:production
```

- `build:preview` produces an installable internal-testing APK
- `build:production` produces the Play-uploadable AAB

### Quick browser preview

```bash
npm install
npm run mobile:web
```

Opens at http://localhost:8081.

Notes:

- Uses sql.js with an in-memory database
- Data resets on page refresh
- Best for quick UI checks, screenshots, and short walkthroughs

### Helpful root wrappers

```bash
npm run mobile:start
npm run mobile:web
npm run mobile:android
npm run mobile:test
npm run mobile:typecheck
npm run mobile:lint
```
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

- Domain tests: 62 passing
- Mobile tests: 70 passing
- Total: 132 passing
- Root/shared typecheck: clean
- Mobile typecheck: clean

Useful commands:

```bash
npm test
npm run typecheck
npm run mobile:test
npm run mobile:typecheck
cd apps/mobile && npx expo export --platform android --output-dir dist-check
```

## Data import and export

The Meals tab supports recipe JSON import/export, cookbook sharing, and recipe URL import on native mobile.

See `docs/DEMO.md` for the walkthrough and `docs/phase5-plan.md` for implementation details.

## Repo layout

```text
apps/mobile/         Expo / React Native app, active runtime
packages/domain/     Shared business logic
packages/contracts/  Shared Zod schemas and portable envelope types
docs/                Active plans, demo docs, and migration/offboarding notes
```

## Helpful docs

- `docs/current-plan.md`
- `docs/current-scope-audit.md`
- `docs/DEMO.md`
- `docs/phase5-plan.md`
- `docs/google-play-closed-testing-plan.md`

## Historical reference

- `docs/migration-plan.md`
- `docs/web-offboarding-plan.md`
- `docs/web-to-mobile-cutover.md`
