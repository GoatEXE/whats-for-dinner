# Web to Mobile Cutover Guide

> Historical reference only: the legacy web app has been removed from the current repo. Keep this guide only for understanding the old cookbook export/import path.

## Purpose

This document records the migration path that moved cookbook data from the legacy web app into the mobile app during cutover.

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

The current repo no longer contains the legacy web app. If you still need a historical export, use the last web-supported tag/commit from git history and perform the export from that checkout.

From the historical web UI:

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

After import, spot-check a few meals against the historical export file.

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

## Historical support status

This cutover path is retained only as historical reference. The current repo supports the mobile app only.

## Related docs

- `README.md`
- `docs/web-offboarding-plan.md`
- `docs/current-plan.md`
- `docs/migration-plan.md`
