# Mobile App Demo Guide

A focused walkthrough for demonstrating the offline-first mobile app built with Expo and React Native.

**Branch:** `mobile-app`

## Setup (one-time)

Install dependencies in the mobile app directory:

```bash
cd apps/mobile
npm install
```

## Running the app

### Browser preview (fastest, ephemeral)

```bash
npm run web
```

Opens at http://localhost:8081. Good for quick feature walkthroughs and UI demos.

**Limitation:** Browser preview uses sql.js with an in-memory database. All data resets when you refresh the page. Sample data auto-loads on each page load.

### Android device (persistent, recommended)

```bash
npx expo start --go --clear
```

Open Expo Go on your Android phone first, then scan the QR code from inside Expo Go. Full SQLite persistence works, so your data survives app restarts and device reboots.

If LAN networking is flaky, retry with:

```bash
npx expo start --go --tunnel --clear
```

## First launch

The app auto-seeds on first launch with:

- 12 complete meals (Taco Tuesday, Spaghetti Bolognese, Chicken Curry, Pepperoni Pizza, and more)
- Pantry stocked with staples (salt, pepper, olive oil, rice, pasta, eggs, butter, flour, onion, garlic)
- Current weekly plan with 4 meals already assigned (Monday, Tuesday, Thursday, Saturday)
- Recent meal history spanning the last 10 days (for testing random picker exclusions)

All sample data is real and editable.

**Note for browser preview:** Sample data reloads automatically on each page refresh since the in-memory database doesn't persist.

## Demo flow (2-3 minutes)

### 1. Plan tab (start here)

- Show the This week / Next week switch at the top of the screen
- Point out the repeat-window chips (`Off`, `3d`, `7d`, `14d`) that control random-pick history exclusion
- Tap an empty slot (Wednesday, Friday, or Sunday) to assign manually, or use the day-row dice button to assign a random meal to that day
- Open the standalone random picker with `What's for Dinner?` and toggle filters like favorites-only or pantry-ready-only
- Tap `Random Fill` to fill all remaining empty slots for the visible week
- If there are not enough eligible meals, show the partial-fill warning instead of a hard failure
- Copy the weekly plan text (demonstrates share/clipboard)

### 2. Meals tab

- Scroll through the meal library
- Search for a meal (try "taco" or "chicken")
- Tap a meal card to view details
- Show ingredients, prep time, tags, notes
- For URL-imported meals, tap the source link to open the original recipe page
- Go back and toggle favorite on a meal
- Tap the overflow menu (⋮) in the header to see import, export, and reset options

### 3. Shop tab

- Generate a shopping list from the week you were viewing on the Plan tab
- Show the split between on-hand and to-buy ingredients
- Tap `Need to buy` items to check them off as you shop
- Copy the shopping list and show that the clipboard output is names only, one ingredient per line
- Tap Pantry to view/edit pantry items
- Add or remove a pantry item
- Regenerate the list and watch the on-hand section update

### 4. Import/export demo (optional)

#### Cookbook export

- From Meals tab, tap Export
- Leave archived meals off for a clean cookbook export, or toggle them on if you want the full library
- On Android/iOS, open the system share sheet and send the JSON file somewhere convenient
- On browser preview, use the clipboard fallback and paste the JSON into a file manually

#### File import

- From Meals tab, tap Import
- Select a recipe JSON file (you can export one first if needed)
- Show the import review screen
- Confirm import and see new meals appear in the library

#### URL import (native only)

- From Meals tab, tap the URL import option (overflow menu → Import from URL)
- Paste a recipe URL (try AllRecipes, Food Network, Budget Bytes)
- Wait for extraction (fetches and parses the page)
- Review extracted name, ingredients, prep time, tags
- Edit if needed, then save
- New meal appears with source URL stored
- View the meal detail to see the tappable source link

#### Android share-intent (custom dev build only)

- From Chrome or any Android app, tap Share on a recipe URL
- Select "What's for Dinner?" from the share sheet
- App opens directly to the URL import screen with the URL pre-filled
- Proceed with extraction/review/save as above
- Shared text without a URL shows a warning and prompts manual paste

**Limitation:** Share-intent requires custom dev build (not Expo Go). See README.md for setup.

**Notes:**
- Cookbook export JSON is compatible with the Import Recipes screen.
- URL import works on Android/iOS only. Browser preview is blocked by CORS; use file import or clipboard export instead on web.

## Settings

### Appearance (dark mode)

- Tap the settings icon (gear) in the Meals tab header
- Select Appearance
- Choose System (default), Light, or Dark
- Appearance preference persists across sessions and is not affected by demo data reset

## Reset for next demo

### On Android/iOS (Expo Go or native)

Tap the settings icon (gear) in the Meals tab header. Tap Reset Demo Data. A confirmation dialog appears. Confirm to reset all data back to the original demo state.

### In browser preview

Just refresh the page. The in-memory database resets automatically and sample data reloads.

### Manual fallback

```bash
# Remove the SQLite file and restart
rm -f apps/mobile/.expo/SQLite/*.db
cd apps/mobile && npm run web
```

## What the app is NOT yet

This demo shows local-first offline functionality only. Not yet implemented:

- Cloud sync or backup (Phase 4 deferred)
- Production-tested Android share-intent build flow (the first slice is wired, but still needs custom dev build + real device verification)
- Custom app icon or splash screen (placeholder assets only)

The current scope is full offline feature parity with the web app plus a demo-ready sample data experience.

## Known limitations

- **Browser preview:** Uses sql.js in-memory database. Data resets on page refresh. Use Android/iOS for persistent storage testing.
- **Expo Go Android:** Fully functional after recent dependency and router fixes. Data persists across app restarts.
- **iOS:** Not yet tested extensively, but should work identically to Android.
