# Recipe Import/Export — Implementation Plan

## 1. Problem Statement

Users want to share recipes with family/friends and back up their meal library. Currently the only way to get data out is copy-pasting from the UI. There is no way to import meals from an external source.

This feature adds the ability to:
- **Export** one or more meals as a portable file
- **Import** meals from a previously-exported file (or hand-authored file)

---

## 2. Current Data Model (Verified)

A meal object returned by the API (`GET /api/meals` or `GET /api/meals/:id`) has this shape:

```json
{
  "id": 42,
  "name": "Test Chili",
  "normalizedName": "test chili",
  "notes": "Slow cooker night",
  "prepMinutes": 20,
  "isFavorite": true,
  "isArchived": false,
  "createdAt": "2026-04-01 12:00:00",
  "updatedAt": "2026-04-01 12:00:00",
  "ingredients": [
    { "ingredientId": 1, "name": "Ground beef", "quantityText": "1 lb", "isOptional": false, "sortOrder": 0 },
    { "ingredientId": 2, "name": "Beans", "quantityText": "2 cans", "isOptional": false, "sortOrder": 1 }
  ],
  "tags": ["comfort"]
}
```

Key relationships:
- **`ingredients`** table is a shared catalog — meals link to it via `meal_ingredients` (M:N with extra columns `quantity_text`, `is_optional`, `sort_order`).
- **`tags`** table is a shared catalog — meals link via `meal_tags` (M:N).
- Ingredient/tag creation is handled by `catalogRepo.ensureIngredients()` / `catalogRepo.ensureTags()` which upsert by normalized name.
- Duplicate meal names are caught via the `normalized_name UNIQUE` constraint on `meals`, surfaced as HTTP 409.

**What needs to be exported per meal:** `name`, `notes`, `prepMinutes`, `isFavorite`, `ingredients` (name, quantityText, isOptional), `tags`.

**What should NOT be exported:** internal IDs, `normalizedName`, `isArchived`, timestamps, `sortOrder` (implied by array position), `ingredientId`/`tagId`.

---

## 3. Export Format Decision

### Recommended: JSON (primary), with a human-readable text variant

**JSON** is the only format that round-trips perfectly for import. Use a clean, documented schema that strips internal IDs and is easy to hand-edit.

**Portable text** (optional second phase) can be offered as a "copy to clipboard" formatted string for sharing in messages/docs — similar to the existing `copyText` pattern on shopping lists. This is export-only (no import from text).

Standard recipe formats (e.g., Schema.org Recipe JSON-LD) were considered but rejected: they include fields this app doesn't use (cook time, yield, instructions, nutrition) and omit fields it does (isFavorite, tags, isOptional on ingredients). The custom JSON is simpler and exactly fits the data model.

### Export File Schema

```jsonc
{
  "format": "whats-for-dinner-recipes",
  "version": 1,
  "exportedAt": "2026-04-09T12:00:00.000Z",
  "meals": [
    {
      "name": "Test Chili",
      "notes": "Slow cooker night",
      "prepMinutes": 20,
      "isFavorite": true,
      "tags": ["comfort"],
      "ingredients": [
        { "name": "Ground beef", "quantityText": "1 lb", "isOptional": false },
        { "name": "Beans", "quantityText": "2 cans", "isOptional": false }
      ]
    }
  ]
}
```

The `format` and `version` fields enable future evolution and let import validation reject unrelated JSON files quickly.

---

## 4. API Endpoints

### 4a. Export

**`GET /api/meals/export`**

Query parameters (all optional):
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `ids` | comma-separated integers | _(all active)_ | Specific meal IDs to export |
| `favorite` | booleanish | — | Filter to favorites only |
| `tag` | string | — | Filter by tag |
| `archived` | booleanish | `false` | Include archived meals |

Response: JSON body with `Content-Disposition: attachment; filename="recipes-YYYY-MM-DD.json"` and `Content-Type: application/json`.

This reuses the existing `listMeals` filtering infrastructure. The response body is the export schema above — NOT wrapped in `{ data: ... }` since it's a file download.

**Why GET, not POST:** No side effects, can be triggered by a simple `<a>` link or `window.open`. The query parameters are small enough for a URL.

### 4b. Import

**`POST /api/meals/import`**

Request body: the export JSON schema (parsed from an uploaded file on the client side).

Request body limit: Already `1mb` in the Express JSON parser config — sufficient for hundreds of recipes.

Response:
```json
{
  "data": {
    "imported": [
      { "name": "Test Chili", "id": 42 }
    ],
    "skipped": [
      { "name": "Existing Meal", "reason": "duplicate" }
    ],
    "failed": [
      { "name": "Bad Meal", "reason": "Validation: ingredients must have at least 1 item" }
    ],
    "summary": {
      "importedCount": 1,
      "skippedCount": 1,
      "failedCount": 1,
      "totalCount": 3
    }
  }
}
```

**Conflict handling strategy — skip duplicates by default:**
- For each meal in the import, normalize the name and check against existing `meals.normalized_name`.
- If a meal with the same normalized name exists (active or archived), it is **skipped** and reported in `skipped[]`.
- This is the safest default for a family app. A future enhancement could add a `?onConflict=replace|skip` query param.

**Validation per meal:**
- Each meal in the array is validated against `mealWriteSchema` (already exists).
- Meals that fail validation are reported in `failed[]` — the import continues for the rest.
- The entire import is NOT wrapped in a single DB transaction — partial success is reported. This avoids an all-or-nothing failure when one meal out of 50 has a typo.

---

## 5. Backend Implementation — Work Packages

### WP-1: Export endpoint (low risk)

**Scope:** `src/modules/meals/meals.routes.js`, `src/modules/meals/meals.service.js`, `src/modules/meals/meals.schemas.js`

**Changes:**
1. Add `exportQuerySchema` to `meals.schemas.js`:
   - `ids`: optional string → parse as comma-separated integers
   - `favorite`, `tag`, `archived`: reuse existing types from `mealListQuerySchema`
2. Add `exportMeals(filters)` to `meals.service.js`:
   - Call `mealsRepo.listMeals(filters)` (with `ids` filter support if provided)
   - Strip each meal to export-safe fields: `name`, `notes`, `prepMinutes`, `isFavorite`, `tags`, and `ingredients` (only `name`, `quantityText`, `isOptional`)
   - Wrap in the export envelope (`format`, `version`, `exportedAt`, `meals`)
3. Add `GET /api/meals/export` route in `meals.routes.js`:
   - Parse & validate query
   - Call service
   - Set `Content-Disposition` header
   - Send JSON response
4. If `ids` filter is used, add a lightweight filter path in the service: call `getMealsByIds` after parsing the comma list to integers. The repo already has `getMealsByIds` (used internally in `buildMeals`), but it's not publicly exposed — it needs to be added to the repo's return object.

**Dependencies:** None.

**Verification:**
- Unit/integration tests: export all meals, export by IDs, export with filters, export when no meals match (empty array, still valid envelope).
- Test `Content-Disposition` header is set.

### WP-2: Import endpoint (medium risk)

**Scope:** `src/modules/meals/meals.routes.js`, `src/modules/meals/meals.service.js`, `src/modules/meals/meals.schemas.js`

**Changes:**
1. Add `importBodySchema` to `meals.schemas.js`:
   - `format`: literal `"whats-for-dinner-recipes"`
   - `version`: literal `1`
   - `exportedAt`: optional string (informational, not validated strictly)
   - `meals`: array of objects, each validated against `mealWriteSchema` — but validation is done per-item in the service, not via the schema's `.parse()` on the whole body, so that partial failures can be reported.
   - The outer schema just validates `format` and `version`; the `meals` field is `z.array(z.unknown())` to allow per-item validation in the service.
2. Add `importMeals(payload)` to `meals.service.js`:
   - Validate envelope (`format`, `version`)
   - Iterate `payload.meals`:
     - Validate each item against `mealWriteSchema.safeParse()`
     - If invalid → push to `failed[]`
     - Check `normalizeName(item.name)` against existing meals (query by normalized name — needs a new repo helper `getMealByNormalizedName` or reuse the existing UNIQUE constraint catch)
     - If duplicate → push to `skipped[]`
     - Otherwise → call `mealsRepo.createMeal(item)` → push to `imported[]`
   - Return the summary response
3. Add `POST /api/meals/import` route.

**New repo helper needed:** `findByNormalizedName(normalizedName)` — a simple `SELECT id, name FROM meals WHERE normalized_name = ?` (check both active and archived). This is better than relying on the UNIQUE constraint exception because it lets us report "skipped" cleanly rather than catching SQLite errors.

**Dependencies:** None (can be done in parallel with WP-1).

**Risks:**
- Large imports could be slow if there are many meals — each calls `createMealTransaction` individually. For the expected scale (family recipe book, <200 meals), this is fine.
- Ingredient catalog pollution: importing meals creates ingredients in the shared catalog. This is the existing behavior of `createMeal` and is acceptable — ingredients are just names, not heavy objects.

**Verification:**
- Integration tests: import valid file, import with duplicates (skipped), import with invalid meals (failed), import with mix of all three, import with wrong `format`/`version` (400), import empty meals array.

### WP-3: Expose `getMealsByIds` from repo (low risk, blocker for WP-1 ids filter)

**Scope:** `src/modules/meals/meals.repo.js`

**Changes:** Add `getMealsByIds` to the return object of `createMealsRepo`. It already exists as an internal function.

**Dependencies:** None.

**Verification:** Existing tests should still pass (it's just exposing an existing function).

---

## 6. Frontend Implementation — Work Packages

### WP-4: Export UI (low risk)

**Scope:** `public/renderers.js`, `public/meals.js`, `public/index.html`

**Changes:**

1. **Per-meal export button** on meal cards in `renderers.js` → `renderMeals()`:
   - Add an "Export" button in the `.actions-row` of each meal card.
   - `data-action="export"` with `data-id="${meal.id}"`.

2. **Bulk export button** in the Meals section header in `index.html`:
   - Add a "Export all" button next to the search box in the Meals panel header.

3. **Action handler** in `meals.js` (or a new `import-export.js` module):
   - Single export: `window.open('/api/meals/export?ids=' + mealId)` — triggers browser download.
   - Bulk export: `window.open('/api/meals/export')` — downloads all active meals.
   - Alternatively, use `fetch()` + `Blob` + programmatic `<a>` click for more control over the download filename. This is more robust across browsers.

**Dependencies:** WP-1 (backend export endpoint).

**Verification:**
- Playwright test: click export button, verify file downloads (or verify the fetch request completes).
- Visual check: button placement doesn't break card layout on mobile.

### WP-5: Import UI (medium risk)

**Scope:** `public/index.html`, `public/meals.js` (or new `public/import-export.js`), `public/renderers.js`

**Changes:**

1. **Import button** in the Meals section header in `index.html`:
   - Add an "Import" button next to the "Export all" button.

2. **Hidden file input** in `index.html`:
   - `<input type="file" id="import-file-input" accept=".json" class="hidden" />`
   - Import button click triggers `importFileInput.click()`.

3. **Import handler** in JS:
   - On `change` event of the file input:
     - Read file via `FileReader` as text
     - `JSON.parse()` — show error status if invalid JSON
     - `POST /api/meals/import` with parsed body
     - Display results: show a status message summarizing imported/skipped/failed counts
     - If there are skipped or failed items, show details in a dialog (use the existing `confirm()` dialog or a new read-only info dialog)
     - Call `loadData()` to refresh the meal list

4. **Result display** — for simplicity, use `showStatus()` for the summary line and a `confirm()`-style dialog for details when there are skipped/failed items. No new UI components needed.

**Dependencies:** WP-2 (backend import endpoint).

**Verification:**
- Playwright test: upload a valid JSON file, verify new meals appear in the list.
- Playwright test: upload a file with duplicates, verify status message mentions skips.
- Playwright test: upload an invalid file, verify error message.

### WP-6: Register elements and state (low risk, blocker for WP-4/WP-5)

**Scope:** `public/elements.js`, `public/index.html`, `public/app.js`

**Changes:**
- Add new element references: `exportAllButton`, `importButton`, `importFileInput`.
- Wire up event listeners in `app.js` `init()`.
- Add action handler in `handleMealActions` for `data-action="export"`.

**Dependencies:** HTML changes from WP-4/WP-5.

---

## 7. Dependency Graph & Sequencing

```
WP-3 (expose getMealsByIds)  ──┐
                                ├──► WP-1 (export endpoint)  ──► WP-4 + WP-6 (export UI)
                                │
WP-2 (import endpoint)  ───────────► WP-5 + WP-6 (import UI)
```

- **WP-3** is trivial (one-line change) and unblocks WP-1's `ids` filter.
- **WP-1** and **WP-2** are independent backend work — can run in parallel.
- **WP-4**, **WP-5**, **WP-6** are frontend work that depends on backend being done. WP-6 touches shared files (`elements.js`, `app.js`, `index.html`) so it should be a single work item merged with either WP-4 or WP-5 to avoid conflicts.

**Recommended execution order for a single worker:**
1. WP-3 → WP-1 → WP-2 (all backend, fast)
2. WP-4 + WP-5 + WP-6 combined (all frontend, in one pass)

**For parallel workers:**
- Worker A: WP-3 + WP-1 (export backend + tests)
- Worker B: WP-2 (import backend + tests)
- Worker C (after A+B merge): WP-4 + WP-5 + WP-6 (all frontend + Playwright tests)

---

## 8. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Export with no meals matching filters | Return valid envelope with `meals: []` |
| Import file is not valid JSON | Frontend catches `JSON.parse` error, shows status message |
| Import file has wrong `format` or `version` | Backend returns 400 with clear message |
| Import meal fails `mealWriteSchema` validation | Reported in `failed[]`, import continues |
| Import meal name matches existing (active or archived) | Reported in `skipped[]`, import continues |
| Import meal references ingredients not in catalog | Fine — `ensureIngredients()` auto-creates them (existing behavior) |
| Import file has 0 meals | Return success with all counts at 0 |
| Import file exceeds 1MB | Express JSON parser returns 413 (existing config) |
| Very large export (hundreds of meals) | JSON response; no pagination needed at family scale |
| Exported meal has `isFavorite: true` — import preserves it | Yes, `mealWriteSchema` accepts `isFavorite` |

---

## 9. Test Plan

### Backend (Vitest + Supertest) — add to `test/integration/app.test.js` or a new `test/integration/import-export.test.js`

**Export tests:**
1. Export all active meals — verify envelope shape, meal count, no internal IDs in output
2. Export by specific IDs — verify only requested meals appear
3. Export with `favorite=true` filter — verify only favorites
4. Export with no matching meals — verify empty `meals[]` array
5. Export sets `Content-Disposition` header with `.json` filename

**Import tests:**
6. Import valid file with 2 new meals — verify both created, response summary
7. Import file with duplicate meal name — verify skipped, existing meal unchanged
8. Import file with one valid and one invalid meal — verify partial success
9. Import file with wrong `format` — verify 400
10. Import file with wrong `version` — verify 400
11. Import empty meals array — verify success with 0 counts
12. Import meal with new ingredients — verify ingredients created in catalog
13. Round-trip test: export meals, import into fresh DB, verify identical data

### Frontend (Playwright)
14. Click "Export all" — verify download triggers (check response or file)
15. Click per-meal "Export" — verify single-meal download
16. Upload valid import file — verify new meals appear in list
17. Upload file with duplicates — verify status message mentions skips
18. Upload non-JSON file — verify error message
19. Mobile viewport: verify import/export buttons are accessible

---

## 10. Open Questions

1. **Should archived meals be exportable?** The plan above defaults to excluding them (matching `listMeals` default behavior) but allows `?archived=true`. This seems right — confirm with user if needed.
2. **Should import ever update/replace existing meals?** The plan defaults to skip-on-duplicate. A `?onConflict=replace` mode could be added later if requested — not worth the complexity for v1.
3. **Should the export button appear on the meal card in all contexts** (random result, weekly plan slots) or only in the Meals tab? Recommend Meals tab only for v1 to keep the plan/picker UI clean.
