# Mobile App Demo Guide

A focused walkthrough for demonstrating the mobile app built with Expo and React Native.

**Branch:** `mobile-app`

## Recommended demo paths

### Preferred: Google Play internal testing build

Use the installed Android Play build whenever possible. This is the best product demo path because it matches how testers will actually receive the app.

### Local fallback: Android device with Expo Go

If you need to run locally from the repo:

```bash
cd apps/mobile
npm install
npx expo start --go --clear
```

Open Expo Go on your Android phone first, then scan the QR code from inside Expo Go.

If LAN networking is flaky, retry with:

```bash
cd apps/mobile
npx expo start --go --tunnel --clear
```

### Custom dev build only

Use an Android custom dev build only when you specifically need to demo or verify share-intent behavior.

## First launch

The app auto-seeds on first launch with:

- 12 complete meals (Taco Tuesday, Spaghetti Bolognese, Chicken Curry, Pepperoni Pizza, and more)
- Pantry stocked with staples (salt, pepper, olive oil, rice, pasta, eggs, butter, flour, onion, garlic)
- Current weekly plan with 4 meals already assigned (Monday, Tuesday, Thursday, Saturday)
- Recent meal history spanning the last 10 days (for testing random-picker exclusions)

All sample data is real and editable.

## Demo flow (2-3 minutes)

### 1. Plan tab (start here)

- Show the This week / Next week switch at the top of the screen
- Point out the repeat-window chips (`Off`, `3d`, `7d`, `14d`) that control random-pick history exclusion
- Tap an empty slot (Wednesday, Friday, or Sunday) to assign manually, or use the day-row dice button to assign a random meal to that day
- Open the standalone random picker with `What's for Dinner?` and toggle filters like favorites-only or pantry-ready-only
- Tap `Random Fill` to fill all remaining empty slots for the visible week
- If there are not enough eligible meals, show the partial-fill warning instead of a hard failure
- Copy the weekly plan text to demonstrate mobile share / clipboard behavior

### 2. Meals tab

- Scroll through the meal library
- Search for a meal (try "taco" or "chicken")
- Tap a meal card to view details
- Show ingredients, prep time, tags, notes
- For URL-imported meals, tap the source link to open the original recipe page
- Go back and toggle favorite on a meal
- Tap the overflow menu (⋮) in the header to show import, export, and reset options

### 3. Shop tab

- Generate a shopping list from the week you were viewing on the Plan tab
- Show the split between on-hand and to-buy ingredients
- Tap `Need to buy` items to check them off as you shop
- Copy the shopping list and show that the clipboard output is names only, one ingredient per line
- Tap Pantry to view or edit pantry items
- Add or remove a pantry item
- Regenerate the list and watch the on-hand section update

### 4. Import / export demo (optional)

#### Cookbook export

- From Meals tab, tap Export
- Leave archived meals off for a clean cookbook export, or toggle them on if you want the full library
- On Android, open the system share sheet and send the JSON file somewhere convenient

#### File import

- From Meals tab, tap Import
- Select a recipe JSON file (you can export one first if needed)
- Show the import review screen
- Confirm import and see new meals appear in the library

#### URL import (native only)

- From Meals tab, tap the URL import option (overflow menu → Import from URL)
- Paste a recipe URL (try AllRecipes, Food Network, Budget Bytes)
- Wait for extraction
- Review extracted name, ingredients, prep time, and tags
- Edit if needed, then save
- New meal appears with source URL stored
- View the meal detail to see the tappable source link

#### Android share-intent (custom dev build only)

- From Chrome or any Android app, tap Share on a recipe URL
- Select "What's for Dinner?" from the share sheet
- App opens directly to the URL import screen with the URL pre-filled
- Proceed with extraction, review, and save as above
- Shared text without a URL shows a warning and prompts manual paste

**Limitation:** Share-intent requires a custom dev build, not Expo Go.

## Settings

### Appearance (dark mode)

- Tap the settings icon (gear) in the Meals tab header
- Select Appearance
- Choose System (default), Light, or Dark
- Appearance preference persists across sessions and is not affected by demo data reset

## Reset for next demo

### Play build / Expo Go / native device

Tap the settings icon (gear) in the Meals tab header. Tap Reset Demo Data. A confirmation dialog appears. Confirm to reset all data back to the original demo state.

## What the app is NOT yet

This demo shows the current local-first mobile product. Not yet implemented:

- Cloud sync or backup (Phase 4 deferred)
- Production-verified Android share-intent rollout for the public tester path
- Full legacy-data migration beyond meal-library export / import

The legacy web app remains only as a temporary migration bridge and rollback reference.

## Known limitations

- URL import and cookbook sharing are native-mobile features; they are not the primary browser demo path
- Android share-intent still requires a custom dev build rather than Expo Go
- iOS has not yet had the same level of testing as Android
