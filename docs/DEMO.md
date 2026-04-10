# Mobile App Demo Guide

A focused walkthrough for demonstrating the offline-first mobile app built with Expo and React Native.

## Setup (one-time)

Install dependencies in the mobile app directory:

```bash
cd apps/mobile
npm install
```

## Running the app

### Browser demo (fastest)

```bash
npm run web
```

Opens at http://localhost:8081. Good for quick feature walkthroughs. Note that expo-sqlite has limited web support and uses in-memory storage in browsers, so data resets on page refresh.

### Mobile device demo (recommended)

```bash
npm start
```

Scan the QR code with Expo Go on your phone. Full SQLite persistence works on real devices.

## First launch

The app auto-seeds on first launch with:

- 12 complete meals (including Taco Tuesday, Spaghetti Bolognese, Chicken Curry, Pepperoni Pizza)
- Pantry stocked with staples (salt, pepper, olive oil, rice, pasta, eggs, butter, flour, onion, garlic)
- Current weekly plan with 4 meals already assigned (Monday, Tuesday, Thursday, Saturday)
- Recent meal history spanning the last 10 days (for testing random picker exclusions)

All sample data is real and editable.

## Demo flow (2-3 minutes)

### 1. Plan tab (start here)

- Show the current weekly plan with pre-filled slots
- Tap an empty slot (Wednesday, Friday, or Sunday)
- Use the random picker to fill it
- Toggle filters: try favorites-only or full-match
- Tap a filled slot to view meal details, then go back
- Tap the Autofill button to fill all remaining empty slots
- Show how autofill avoids reusing meals already in the plan
- Copy the weekly plan text (demonstrates share/clipboard)

### 2. Meals tab

- Scroll through the meal library
- Search for a meal (try "taco" or "chicken")
- Tap a meal card to view details
- Show ingredients, prep time, tags, notes
- Go back and toggle favorite on a meal
- Show the Import/Export buttons (no need to actually import unless you want to demo the flow)

### 3. Shop tab

- Generate a shopping list from the current weekly plan
- Toggle "Include pantry" to see the difference
- Show the split between on-hand and to-buy ingredients
- Copy the shopping list (demonstrates clipboard integration)
- Tap Pantry to view/edit pantry items
- Add or remove a pantry item
- Regenerate the list and watch the on-hand section update

### 4. Import demo (optional)

- From Meals tab, tap Import
- Select a recipe JSON file (you can export one first if needed)
- Show the import review screen
- Confirm import and see new meals appear in the library

## Reset for next demo

The app includes a reset helper at `apps/mobile/src/db/reset.ts` that clears the database and re-seeds sample data. Currently not wired to a UI button, but you can trigger it manually or restart with a fresh install:

1. Uninstall the app or clear app data (device settings)
2. Relaunch
3. Sample data loads automatically

Alternatively, for quick resets during development:

```bash
# In apps/mobile/
# Remove the SQLite file and restart the app
rm -f .expo/SQLite/*.db
npm run web
```

## What the app is NOT yet

This demo shows local-first offline functionality only. Not yet implemented:

- Cloud sync or backup (Firebase integration planned for Phase 4)
- Recipe URL import or web scraping (planned for Phase 5)
- Android share-intent receiver (planned for Phase 5)
- Custom app icon or splash screen (placeholder assets only)
- Push notifications or background sync

The current scope is full offline feature parity with the web app plus a demo-ready sample data experience.
