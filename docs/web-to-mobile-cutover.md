# Web to Mobile Cutover Guide

## Purpose

This is the currently supported migration path for moving from the legacy web app into the mobile app while web offboarding is in progress.

The mobile app is now the primary supported runtime. The legacy web app remains available temporarily as a fallback and migration bridge until the final cutover is complete.

## What migrates today

The current supported path moves the meal library only:

- meals
- ingredients
- tags
- prep time
- notes
- favorite state

The export/import format is the shared portable recipe envelope used by both the legacy web app and the mobile app.

## What does not migrate today

This path does not currently move:

- pantry state
- weekly plans
- meal history
- archived meals that remain archived at export time
- app appearance settings

Important note about archived meals:

- the legacy web export uses the normal meal list export path, which exports active meals
- if you need an archived meal in mobile, unarchive it in the web app before exporting

## Step 1: export from the legacy web app

If you still need to run the legacy web app locally:

```bash
npm install
npm run legacy:web:start
```

Then open:

```text
http://localhost:3000
```

From the web UI:

1. Open the **Meals** tab
2. Click **Export**
3. Save the downloaded JSON file

The export comes from the existing `/api/meals/export` endpoint and is already compatible with the mobile import flow.

## Step 2: import into the mobile app

Open the mobile app using your preferred path:

- Play/internal testing build
- preview APK
- Expo Go, if you are still validating locally (`npm run mobile:start`)
- Expo web preview for dry runs only (`npm run mobile:web`)

Then:

1. Open the **Meals** tab
2. Open the overflow menu in the header
3. Choose **Import**
4. Select the exported JSON file
5. Review the import result summary

Expected behavior:

- valid meals import into the mobile library
- duplicates are skipped by normalized meal name
- invalid entries are reported in the import summary

## Step 3: verify the imported library

After import, spot-check a few meals and compare against the web app.

Recommended verification:

- meal count looks roughly right
- a few favorites came across correctly
- ingredients, tags, notes, and prep time are present
- duplicate meals were skipped rather than duplicated

## Recommended cutover behavior

Once the mobile import looks correct:

- treat the mobile app as the source of truth going forward
- avoid editing both systems in parallel
- rebuild pantry state manually in mobile
- rebuild current/next weekly plans manually in mobile

## Support status during offboarding

Current support policy:

- mobile app is the primary supported runtime
- legacy web app is frozen and exists only as a temporary bridge
- final runtime removal is intentionally deferred until Play testing is stable

## Related docs

- `README.md`
- `docs/web-offboarding-plan.md`
- `docs/current-plan.md`
- `docs/migration-plan.md`
