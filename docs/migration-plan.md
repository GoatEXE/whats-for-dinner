# React Native / Expo Migration Plan

## Executive summary

Build the mobile app **next to** the current web app, not by mutating the current Express app into a mobile backend. The safest path is:

---

## Progress tracker

- **Phase 1 — Foundations and app shell** — ✅ Complete
  - Mobile app scaffold with Expo Router + 3-tab layout
  - Shared packages: `domain` (business logic) and `contracts` (Zod schemas)
  - Local SQLite DB with migration system and sync-ready schema
  - File import for existing meal export format

- **Phase 2 — Offline meal library, pantry, suggestions, and shopping parity** — ✅ Complete
  - Meal CRUD with archive/favorite support
  - Pantry management and ingredient catalog
  - Suggestion matching with current scoring/sort
  - Random meal picker with lookback exclusion
  - Shopping list generation with on-hand/to-buy split
  - Recipe JSON import/export within the app
  - Search/filter in meal library

- **Phase 3 — Weekly plans, history, and plan-sharing parity** — ✅ Complete
  - Weekly plan create/archive/reuse
  - Per-slot assign/random/clear/serve
  - Autofill empty slots with cumulative exclusion
  - Archived plans list/detail
  - Recent meal history
  - Plan text copy/share
  - Shopping list from active plan

**Demo-ready milestone reached:** The mobile app now includes polished sample data auto-seeding (12 realistic meals, pantry staples, pre-filled weekly plan, recent history), Expo web support for browser demos, and all core workflows tested and working offline. See `docs/DEMO.md` for the full walkthrough. No branding assets (custom icons/splash) yet, but UX is ready for hands-on evaluation.

- **Phase 4 — Firebase auth, Firestore sync, and production data safety** — 🔲 Not started
  - Google sign-in -> Firebase Auth
  - Firestore collections and security rules
  - Sync queue and pull/push engine
  - Manual sync status UI and error recovery

- **Phase 5 — Recipe URL import, Android share-intent, migration cutover** — 🔲 Not started
  - Android share-intent receiver
  - "Import from URL" flow
  - Firebase Cloud Function recipe parser
  - Migration runbook for legacy data
  - Web app retirement

---

## Executive summary (continued)

Build the mobile app **next to** the current web app, not by mutating the current Express app into a mobile backend. The safest path is:

- keep the current app as the behavior oracle until parity is proven;
- move the core business rules into shared pure TypeScript domain code;
- use **Expo + React Native** for UI;
- use **local SQLite on-device as the source of truth** for offline/local-first behavior;
- use **Firebase Auth + Firestore** as the cloud sync/backup layer;
- use **Firebase Cloud Functions** only where mobile should not do the work itself, especially **recipe URL scraping/parsing**.

That gives you offline reliability, preserves the current relational logic, keeps Firebase serverless, and avoids rebuilding the current API surface as a thin remote wrapper around logic that really belongs on-device.

---

## 1. Architecture overview

### 1.1 Guiding principles

1. **Local-first wins over backend-first.**
   - The app must work without network.
   - All core workflows should read/write local state first.
   - Cloud sync is asynchronous and recoverable.

2. **Port the domain logic, not the HTTP API.**
   - The current Express routes are implementation detail.
   - The real asset is the logic behind normalization, matching, shopping, random selection, weekly planning, and import/export.
   - Rebuild those as pure TS modules that can run on-device.

3. **Keep the current app until parity and migration are proven.**
   - Do not retire the web app early.
   - Treat it as a working reference implementation and migration bridge.

4. **Use serverless only where it adds value.**
   - Auth, Firestore sync, and recipe-page parsing fit Firebase well.
   - Suggestions, shopping list generation, weekly autofill, and random picking should stay local.

### 1.2 Recommended target structure

Add the mobile app into the existing repo without disrupting the current codebase.

```text
apps/
  mobile/
    app/                    # Expo Router routes
    src/
      features/
        meals/
        pantry/
        suggestions/
        shopping/
        plans/
        history/
        import/
        sync/
      db/
        schema/
        migrations/
        repos/
      services/
        firebase/
        recipe-import/
      ui/
      hooks/
      state/
packages/
  domain/                   # pure TS ports of current business logic
  contracts/                # zod schemas, import/export envelope, shared types
functions/
  src/
    recipeImport/           # Firebase callable/HTTP function for recipe parsing
src/                        # current Express app remains intact during migration
public/                     # current web UI remains intact during migration
docs/
  migration-plan.md
```

### 1.3 Recommended mobile stack

- **Framework:** Expo + React Native + TypeScript
- **Navigation:** Expo Router
- **Forms/validation:** React Hook Form + Zod
- **Local database:** `expo-sqlite` with explicit migrations
- **Cloud:** Firebase Auth + Firestore
- **Auth flow:** Google sign-in via Expo Auth Session -> Firebase Auth credential
- **Sync triggers:** NetInfo + app foreground events + manual refresh
- **Clipboard/share/files:** `expo-clipboard`, `expo-sharing`, `expo-file-system`, `expo-document-picker`
- **Testing:** Vitest/Jest for domain + repo tests, React Native Testing Library for components, Firebase Emulator Suite for sync/functions, Maestro for device E2E
- **Build/distribution:** EAS Build + custom dev client

### 1.4 Why SQLite on-device instead of Firestore-only offline persistence

Use **SQLite as the primary local store**.

Reasoning:

- The current app is fundamentally relational:
  - meals ↔ ingredients
  - pantry ↔ ingredient catalog
  - weekly plans ↔ slots ↔ meals
  - history-based random exclusion
- The core algorithms depend on deterministic local queries and transactions.
- Firestore offline cache alone is not a great fit for:
  - relational lookups,
  - compound local transformations,
  - robust import workflows,
  - plan transactions,
  - future schema evolution under your control.
- Expo SQLite maps naturally to the existing SQLite schema and makes migration safer.

**Recommendation:**

- SQLite is the authoritative device store.
- Firestore is the remote sync/backup store.
- If later you decide you want native Firebase offline behavior too, that is additive, not foundational.

### 1.5 Runtime flow

For almost every feature, the runtime path should be:

```text
UI action
-> form validation (Zod)
-> local use-case/domain function
-> SQLite transaction
-> enqueue sync job
-> update UI from local DB
-> background sync pushes/pulls Firestore changes
```

This matters because it keeps the app responsive and usable in airplane mode.

### 1.6 Navigation structure

Preserve the current mental model: **3 primary tabs**.

#### Bottom tabs

- **Plan**
- **Shop**
- **Meals**

#### Suggested route layout

```text
app/
  (tabs)/
    plan/
      index.tsx             # current plan + quick picker + recent history summary
      history.tsx           # archived plans list
      [planId].tsx          # archived plan detail
    shop/
      index.tsx             # shopping list + pantry + matches
      pantry.tsx            # pantry-focused editor screen if needed
      suggestions.tsx       # dedicated suggestion results screen if needed
    meals/
      index.tsx             # meal library
      [mealId].tsx          # meal detail
      edit.tsx              # create/edit meal
      import.tsx            # import from file / url
  modals/
    random-picker.tsx
    meal-picker.tsx
    import-review.tsx
    sync-status.tsx
    share-intent.tsx
```

#### UX notes

- Keep the current tab grouping because it already matches the user workflow.
- Use modal screens for pickers/import review rather than deep nested stacks where possible.
- On mobile, copy/export becomes **share sheet + clipboard** instead of browser download links.

### 1.7 Firebase setup

#### Auth

- Firebase project with Google sign-in enabled.
- Data scoped under `users/{uid}`.
- Prefer allowing the app to work locally before sign-in, then prompt for Google sign-in when enabling backup/sync.

#### Firestore

- One user namespace per signed-in user.
- Security rules: user can only read/write `users/{request.auth.uid}/**`.
- Use batched writes for plan updates and multi-document sync pushes.

#### Cloud Functions

Use Cloud Functions only for:

- recipe URL parsing/scraping,
- optional future migration helpers,
- optional future remote conflict tooling.

Do **not** re-create the current REST API endpoint-by-endpoint unless a later requirement justifies it.

### 1.8 Local-first sync design

#### Source of truth

- **Local SQLite is authoritative for app behavior.**
- Firestore is authoritative only as remote backup/cross-device transport.

#### Required sync metadata

Add lightweight sync bookkeeping in the mobile schema:

- `updated_at`
- `deleted_at` for true deletes/tombstones
- `sync_status` (`clean | dirty | syncing | error`)
- `last_synced_at`
- `device_id`

Add support tables:

- `sync_queue`
- `sync_state` (per collection/entity cursors)

#### Conflict policy

Because this is single-user and not collaborative, keep the first conflict model simple:

- **last write wins** based on `updated_at`
- local dirty records push first
- then remote changes pull down
- if a real conflict is detected, log it and surface a non-blocking “updated elsewhere” notice

Do not over-engineer conflict resolution for phase 1.

#### Sync triggers

- app launch
- app foreground
- network reconnect
- explicit pull-to-refresh / sync button

Avoid depending on fully headless background sync in early phases; mobile OS background behavior is unreliable and unnecessary for initial scope.

### 1.9 Business-logic extraction plan

Create a shared `packages/domain` package and port these current modules first:

- normalization (`normalizeName`, `normalizeTag`)
- ingredient resolution
- match building/sorting
- random picker filtering
- shopping list aggregation/plain-text formatting
- weekly plan slot update rules
- weekly autofill cumulative exclusion
- import/export envelope parsing and validation

The goal is to preserve behavior with minimal reinterpretation.

---

## 2. Phase breakdown

### Phase 1 — Foundations, app shell, and domain parity harness

### Goal

Stand up the Expo app, local DB, and shared business-logic package while keeping the current web app untouched.

### Build

- Create `apps/mobile` with Expo Router + TypeScript.
- Decide early that development uses a **custom dev client**, not Expo Go, because share-intent/native integrations will be needed.
- Add SQLite wrapper and migration system.
- Define the new local schema with stable text IDs and sync metadata.
- Create `packages/domain` and `packages/contracts`.
- Port normalization and import/export envelope logic first.
- Build the base 3-tab shell with placeholder screens.
- Add file import of the existing meal export envelope as the first real end-to-end data path.

### Dependencies

- None.

### Validate independently

- App boots on Android emulator/device.
- SQLite migrations run from a clean install.
- Existing recipe export JSON imports successfully into local SQLite.
- Ported unit tests for normalization/import validation pass.

### Exit criteria

- A clean mobile skeleton exists.
- Existing meal export files can seed the app.
- Shared domain code is established and testable.

---

### Phase 2 — Offline meal library, pantry, suggestions, and shopping parity

### Goal

Reach local-only feature parity for the meal and shopping workflows.

### Build

- Meal CRUD
- meal archive/favorite toggle
- ingredient catalog management and normalization
- tags
- pantry CRUD
- suggestion matching with current scoring/sort rules
- random meal picker with lookback + exclusion
- shopping list generation with on-hand / to-buy split
- recipe JSON import/export in the app
- copy/share for shopping list text
- search/filter in meal library

### Dependencies

- Phase 1 local DB and shared domain package

### Validate independently

- All flows work in airplane mode.
- Current unit tests for ingredient resolution, suggestions, shopping list, and validation are ported and passing.
- Golden fixture comparisons between current backend output and new domain functions match for representative datasets.

### Exit criteria

- Plan-less day-to-day usage is possible entirely offline.
- The mobile app is already useful even without Firebase.

---

### Phase 3 — Weekly plans, history, and plan-sharing parity

### Goal

Complete local parity for the planning workflow before introducing sync complexity.

### Build

- weekly plan create/archive/reuse
- active plan invariant (one active plan)
- per-slot assign/random/clear/serve
- autofill empty slots with cumulative exclusion
- archived plans list/detail
- recent meal history
- plan text copy/share
- generate shopping list from active plan

### Dependencies

- Phase 2 complete, because plans depend on meals, pantry, suggestions, shopping, and history

### Validate independently

- All weekly plan flows work offline.
- Ported weekly-plan unit tests and integration-style local DB tests pass.
- Manual parity check against the current web app for:
  - slot update rules,
  - served-state derivation,
  - archived plan behavior,
  - autofill partial-fill behavior.

### Exit criteria

- The mobile app reaches full functional parity with the current app while offline/local-only.
- At this point the old app can remain as fallback, but the mobile feature surface is complete.

---

### Phase 4 — Firebase auth, Firestore sync, and production data safety

### Goal

Add cloud identity and sync **after** local behavior is stable.

### Build

- Google sign-in -> Firebase Auth
- Firestore collections and security rules
- sync queue and pull/push engine
- manual sync status UI and error recovery
- first-run “connect backup/sync” flow
- Firebase Emulator Suite for automated validation
- optional “local-only mode until sign-in” onboarding

### Dependencies

- Phases 2-3 complete; sync should be layered onto a stable local model, not invented at the same time

### Validate independently

- Create/edit/archive data offline, reconnect, and verify push.
- Sign in on a second device/emulator and verify pull.
- Emulator tests pass for auth, rules, and sync flows.
- No core workflow depends on network to complete.

### Exit criteria

- Cloud backup/sync is stable.
- Losing a device is no longer catastrophic.
- Cross-device future use is possible even if not a primary requirement today.

---

### Phase 5 — Recipe URL import, Android share-intent, migration cutover, and web retirement

### Goal

Finish the mobile-native import experience and create a safe cutover path away from the web app.

### Build

- Android share-intent receiver for shared URLs/text
- “Import from URL” flow inside the app
- Firebase Cloud Function recipe parser
- import review/edit screen before save
- manual fallback entry when parsing is weak or fails
- migration runbook for legacy data
- final cutover checklist
- optional one-time full-state exporter for pantry/history/weekly plans before decommissioning the web app

### Dependencies

- Phase 1 app shell
- Phase 2 meal import/save
- Phase 4 Firebase/Functions environment

### Validate independently

- Share a recipe URL from Pinterest/browser into the app on Android.
- Parse, review, edit, and save a meal.
- Perform a full migration dry run from legacy export into a fresh mobile install.
- Verify counts and spot-check meal content before cutover.

### Exit criteria

- Mobile-native import workflow works.
- Migration from the legacy app is rehearsed and documented.
- The old web app can be retired only after this sign-off.

---

## 3. Data model mapping

### 3.1 ID strategy

Do **not** carry forward SQLite autoincrement integer IDs into the mobile architecture.

Use:

- **UUIDv7** for `meals`, `meal_history`, `weekly_plans`
- **deterministic IDs derived from normalized name** for `ingredients` and `tags`
  - example: `ingredient_${hash(normalizedName)}`
  - example: `tag_${hash(normalizedName)}`

Why this matters:

- ingredient/tag dedupe becomes stable across devices and imports;
- Firestore uniqueness is easier when the natural key becomes the document ID;
- local and remote mapping becomes deterministic.

### 3.2 Local mobile schema

Keep the local mobile schema close to the current SQLite schema so the domain logic ports cleanly.

### Core tables

- `meals`
- `ingredients`
- `meal_ingredients`
- `pantry_items`
- `meal_history`
- `tags`
- `meal_tags`
- `weekly_plans`
- `weekly_plan_slots`

### Additional mobile/sync tables

- `sync_queue`
- `sync_state`
- optional `import_jobs` / `import_sources`

### Recommended new meal fields

To support recipe import without bloating the initial domain model:

- `source_url` nullable
- `source_host` nullable
- `image_url` nullable
- optional `import_source_type` (`manual | file | url | share_intent`)

If you later decide to store full instructions, add that as a separate field in a later schema version; it is not required for parity.

### 3.3 Firestore mapping

Use one user namespace:

```text
users/{uid}/
  ingredients/{ingredientId}
  tags/{tagId}
  meals/{mealId}
  history/{historyId}
  weeklyPlans/{planId}
  meta/profile
  meta/pantry
```

### Recommended document shapes

| Current SQLite model                       | Local mobile model   | Firestore model                                                                                   |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------- |
| `ingredients`                              | `ingredients` table  | `users/{uid}/ingredients/{ingredientId}` doc with `name`, `normalizedName`, timestamps            |
| `tags`                                     | `tags` table         | `users/{uid}/tags/{tagId}` doc with `name`, `normalizedName`, timestamps                          |
| `meals` + `meal_ingredients` + `meal_tags` | same 3 local tables  | `users/{uid}/meals/{mealId}` doc with meal fields plus embedded `ingredientRefs[]` and `tagIds[]` |
| `pantry_items`                             | `pantry_items` table | `users/{uid}/meta/pantry` doc with `items[]` keyed by ingredientId                                |
| `meal_history`                             | `meal_history` table | `users/{uid}/history/{historyId}` doc                                                             |
| `weekly_plans` + `weekly_plan_slots`       | same 2 local tables  | `users/{uid}/weeklyPlans/{planId}` doc with embedded `slots[]`                                    |

### Example meal doc

```json
{
  "id": "meal_01J...",
  "name": "Taco Soup",
  "normalizedName": "taco soup",
  "notes": "Slow cooker",
  "prepMinutes": 15,
  "isFavorite": true,
  "isArchived": false,
  "ingredientRefs": [
    {
      "ingredientId": "ingredient_xxx",
      "quantityText": "1 lb",
      "isOptional": false,
      "sortOrder": 0
    }
  ],
  "tagIds": ["tag_xxx"],
  "sourceUrl": null,
  "sourceHost": null,
  "imageUrl": null,
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null
}
```

### Example weekly plan doc

```json
{
  "id": "plan_01J...",
  "weekStart": "2026-04-13",
  "isArchived": false,
  "slots": [
    { "day": 0, "mealId": "meal_...", "notes": null },
    { "day": 1, "mealId": null, "notes": null }
  ],
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null
}
```

### 3.4 Business-logic preservation notes

These rules should remain local domain code, unchanged in spirit from today:

- ingredient/tag normalization before persistence
- dedupe by normalized ingredient/tag names
- meal duplicate detection by normalized meal name
- suggestion scoring and sorting
- random picker recent-history exclusion
- shopping list aggregation
- weekly autofill cumulative exclusion
- served-slot derivation from `(mealId, servedOn)`
- import/export envelope validation

The easiest way to preserve behavior is to port the current service logic nearly line-for-line into pure TS, then adapt repositories around it.

---

## 4. Recipe import architecture

### 4.1 Why recipe parsing should be server-side

The requested scraping libraries (`metascraper`, `recipe-data-scraper`, `@julianpoemp/html-recipe-parser`) are much better suited to **Node/serverless** than to React Native.

Reasons:

- HTML parsing dependencies are Node-oriented.
- Some recipe sites behave differently for mobile/browser requests.
- Redirect handling and Pinterest resolution are more reliable server-side.
- You avoid shipping scraping complexity and brittle parsing code into the mobile bundle.

**Recommendation:** recipe parsing lives in a Firebase Cloud Function, not in the device app.

### 4.2 Entry points

Support two entry points:

1. **In-app URL import**
   - user pastes a URL
   - app opens import flow

2. **Android share-intent import**
   - user shares a URL from Pinterest/browser
   - Android launches the app into an import-review route

### 4.3 Import flow

```text
URL arrives (paste or share intent)
-> app normalizes obvious whitespace/text noise
-> app calls Cloud Function `parseRecipeUrl`
-> function resolves redirects/canonical URL
-> function fetches HTML
-> function extracts schema.org JSON-LD Recipe data
-> function applies parser fallbacks if needed
-> function returns normalized recipe draft + confidence + source metadata
-> app shows editable review screen
-> user edits/fixes
-> save creates local meal + local ingredients + sync job
```

### 4.4 Pinterest and redirect handling

Pinterest URLs often do not directly contain the canonical recipe payload you want.

The parser function should:

- follow redirects;
- attempt to resolve Pinterest outbound destination when possible;
- fall back to parsing the final reachable HTML page;
- return both `submittedUrl` and `resolvedUrl` for transparency/debugging.

### 4.5 Parser pipeline

Suggested order inside the Cloud Function:

1. **Fetch page + follow redirects**
2. **Extract schema.org JSON-LD** directly when present
3. **Run parser libraries in order**
   - `recipe-data-scraper`
   - `metascraper` with recipe/json-ld rules
   - `@julianpoemp/html-recipe-parser`
4. **Normalize to app draft format**
5. **Score confidence**
6. **Return warnings if fields are missing**

### 4.6 Normalized recipe draft shape

Recommended function response:

```json
{
  "submittedUrl": "https://...",
  "resolvedUrl": "https://...",
  "confidence": "high",
  "mealDraft": {
    "name": "Creamy Chicken Tortilla Soup",
    "notes": null,
    "prepMinutes": 20,
    "ingredients": [
      { "name": "Chicken breast", "quantityText": "1 lb", "isOptional": false }
    ],
    "tags": [],
    "sourceUrl": "https://...",
    "sourceHost": "example.com",
    "imageUrl": "https://..."
  },
  "warnings": ["Instructions were not imported"]
}
```

### 4.7 App-side review screen

Never auto-save scraped recipes silently.

The review screen should allow the user to:

- edit title
- delete bad ingredients
- fix ingredient names/quantities
- mark optional ingredients
- add tags
- confirm or cancel

### 4.8 Fallback behavior

If parsing fails or confidence is low:

- show a manual meal form prefilled with whatever was recovered:
  - page title
  - source URL
  - maybe image URL
- let the user finish by hand

This keeps the feature useful even when scraping is messy.

---

## 5. Migration path

### 5.1 Treat the current export format as the first migration bridge

The current app already exports meals as a portable envelope:

```json
{
  "format": "whats-for-dinner-recipes",
  "version": 1,
  "exportedAt": "...",
  "meals": []
}
```

That should remain the **first migration contract**.

### Mobile importer requirements

- accept current `format/version` exactly
- assign new mobile IDs on import
- create deterministic ingredient/tag IDs from normalized names
- dedupe meals by normalized name
- preserve favorite flag, tags, and ingredient order
- mark imported records as `dirty` so they sync to Firestore later

### 5.2 Versioning strategy

Do not break import of the existing envelope.

Recommended policy:

- **importer supports v1 immediately**
- future mobile export can introduce **v2** with optional metadata such as `sourceUrl`, `imageUrl`, etc.
- v1 imports map missing fields to `null`

### 5.3 Migration sequence for meals

1. User exports recipes from the current web app.
2. User installs the mobile app.
3. On onboarding, user chooses **Import recipes from file**.
4. Importer validates the envelope.
5. Meals, ingredients, tags, and relationships are inserted locally.
6. User signs in with Google.
7. Sync uploads imported data to Firestore.

### 5.4 Important gap: current export only covers meals

Today’s export bridge covers the meal library, but not the full app state.

Before final retirement of the web app, add **one** of these:

### Option A — preferred for clean cutover

Add a **legacy full-backup export** producing:

- meals
- pantry
- meal history
- weekly plans + slots
- tags/catalog as needed

### Option B — one-time migration script

Write a Node script that reads the current SQLite DB directly and emits a portable backup bundle.

### Recommendation

Use **Option B** if you want minimal extra legacy-app work, since the current repo already has direct SQLite access and the mobile schema is known.

### 5.5 Final cutover runbook

When mobile parity is complete:

1. Freeze legacy changes for a short cutover window.
2. Export recipes from the web app.
3. Export or script-dump pantry/history/weekly plans.
4. Import into a fresh mobile build.
5. Compare counts:
   - meals
   - favorites
   - pantry items
   - recent history rows
   - active plan
   - archived plans
6. Spot-check several meals and at least one archived plan.
7. Enable Firestore sync.
8. Keep the web app read-only for a short safety period.
9. Retire the web app only after the mobile data looks correct.

### 5.6 What not to build

Do **not** build live bidirectional sync between the current Express app and Firebase unless a new requirement appears. That is expensive and unnecessary for a full-replacement migration.

Use export/import as the boundary between old and new systems.

---

## 6. Testing strategy

### 6.1 Test pyramid for the mobile architecture

### 1. Domain unit tests

Directly replace the current backend unit tests with shared-domain tests for:

- normalization
- ingredient resolution
- suggestion scoring/sorting
- random picker exclusion logic
- shopping list aggregation
- weekly autofill behavior
- import/export validation

**Goal:** preserve business rules exactly.

### 2. Local repository/integration tests

Test SQLite-backed repositories and use-cases together:

- meal CRUD
- pantry replacement/upsert/delete
- plan creation/reuse/archive
- served-slot/history linkage
- import flows
- search/filter behavior

**Goal:** replace the current API integration tests with local data-layer integration tests.

### 3. Firebase sync/emulator tests

Use Firebase Emulator Suite for:

- auth flows
- Firestore security rules
- push/pull sync behavior
- conflict handling
- recipe parser Cloud Function contracts

**Goal:** validate cloud behavior without touching production Firebase.

### 4. Component tests

Use React Native Testing Library for:

- meal editor
- pantry editor
- shopping list view
- weekly plan screen
- import review screen
- error/status banners

**Goal:** replace a chunk of the current UI behavior tests at the component level.

### 5. Device E2E tests

Use **Maestro** for Android-first flows:

- onboarding/import
- meal CRUD
- pantry/suggestion/shopping flows
- weekly plan flows
- offline -> reconnect sync flow
- share-intent recipe import

**Goal:** replace Playwright E2E with device-realistic mobile coverage.

### 6.2 Mapping from current suite to new suite

| Current suite                       | Replacement                                     |
| ----------------------------------- | ----------------------------------------------- |
| Vitest unit tests for services/libs | shared domain unit tests                        |
| Supertest API integration tests     | SQLite repository/use-case integration tests    |
| Playwright UI tests                 | React Native Testing Library + Maestro          |
| Import/export integration tests     | importer tests + emulator contract tests        |
| Weekly plan integration tests       | local DB integration tests + Maestro plan flows |

### 6.3 Parity strategy during migration

Use the existing app as a **golden oracle** while porting.

Recommended tactic:

- create representative fixtures from the current app;
- run the current service logic against those fixtures;
- run the new TS domain functions against the same fixtures;
- compare outputs for matches, shopping lists, random eligibility, and autofill results.

This reduces behavior drift.

### 6.4 Non-functional testing

Also include:

- SQLite migration tests across schema versions
- cold-start tests with larger data sets
- offline/airplane-mode manual checks
- Android share-intent manual tests on real device
- EAS build validation for Android from the first native integration onward

---

## 7. Key risks and mitigations

| Risk                                            | Why it matters                                                   | Mitigation                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Sync bugs corrupt or duplicate data             | Local-first + cloud sync is the hardest new capability           | Keep SQLite authoritative, use stable IDs, add sync queue, test heavily with Firebase Emulator, and start with single-user last-write-wins |
| Trying to use Firestore as the only local store | Complex relational logic becomes harder and more brittle         | Use SQLite for app behavior; use Firestore only for sync/backup                                                                            |
| Expo/native integration surprises               | Share intent, auth, and some integrations need native config     | Commit early to custom dev client + EAS; do not assume Expo Go is sufficient                                                               |
| Recipe scraping is brittle                      | Recipe sites vary wildly and Pinterest often redirects           | Put parsing in Cloud Functions, use multiple parser fallbacks, always require user review, keep manual entry fallback                      |
| Firestore lacks strong uniqueness constraints   | Duplicate ingredients/tags/meals could appear across devices     | Use deterministic IDs for ingredients/tags; keep meal dedupe local by normalized name; surface rare conflicts instead of overbuilding now  |
| Current export format only migrates meals       | Final cutover could otherwise lose pantry/history/plans          | Add a one-time full-backup export or SQLite migration script before retiring the web app                                                   |
| Overbuilding serverless endpoints               | Recreating the REST API wastes time and weakens offline behavior | Keep domain logic local; use Functions only for recipe parsing and migration helpers                                                       |
| Cutover happens before parity is proven         | Family workflow gets interrupted                                 | Do not decommission the web app until mobile has full offline parity, migration rehearsal, and data spot-check sign-off                    |

---

## Recommended immediate next actions

1. Create `apps/mobile` with Expo Router + TypeScript.
2. Add local SQLite migrations with text-based IDs.
3. Create `packages/domain` and port:
   - normalize
   - ingredient resolution
   - shopping list aggregation
   - suggestion sorting
4. Implement file import of the current recipe export envelope.
5. Build the 3-tab shell and basic meal list.
6. Only after local parity is solid, add Firebase sync.

That order gives you the fastest path to a usable mobile app without taking on sync and scraping complexity too early.
