# Phase 5 Plan — Recipe URL Import (Local/Offline)

> Produced 2026-04-12. Branch: `mobile-app`. No cloud dependencies.

## Problem Statement

Adding meals manually (name, each ingredient, tags, notes) is the biggest friction point in the app. The #1 quality-of-life feature users would feel immediately is **pasting a recipe URL and having the app extract meal data automatically**. This eliminates the tedious per-field data entry that discourages building a real meal library.

Phase 5 was originally scoped as "Recipe URL import + Android share-intent." With Firebase deferred, all work stays local/offline-first. The share-intent requires a custom dev build (not Expo Go compatible) so it's deferred to a later commit after the core extraction logic ships.

## Constraints

- **No cloud services** — all parsing happens on-device or uses publicly reachable URLs only.
- **Expo Go compatible** — no native modules that require a dev build.
- **Offline-first** — extracted data lands in local SQLite; no server round-trips.
- **Incremental** — each commit is demoable and independently testable.
- **Existing schema ready** — `meals` table already has `source_url TEXT` and `source_host TEXT` columns; `MealWriteInput` already accepts `sourceUrl`/`sourceHost` fields. No migration needed.

## Approach: Client-Side HTML Extraction

Fetching a URL and parsing the HTML on-device is the simplest offline approach. Most recipe sites embed **JSON-LD** structured data (`@type: "Recipe"` from schema.org) in their HTML. This is the same standard Google uses for rich recipe snippets, so coverage is excellent across major recipe sites (AllRecipes, Food Network, Serious Eats, NYT Cooking, Budget Bytes, etc.).

**Extraction strategy (priority order):**
1. **JSON-LD `Recipe`** — Parse `<script type="application/ld+json">` blocks; find objects with `@type: "Recipe"`. Extract `name`, `recipeIngredient[]`, `recipeInstructions`, `prepTime`/`cookTime`/`totalTime`, `recipeCategory`/`keywords` (→ tags), `image`.
2. **Microdata fallback** — If no JSON-LD, scan for `itemtype="https://schema.org/Recipe"` and pull `itemprop` attributes. (Nice-to-have for Commit 2+, not Commit 1.)
3. **Manual fallback** — If extraction fails, pre-fill `sourceUrl` and `sourceHost`, show empty form for manual entry. Never a dead end.

**Why not a cloud scraping service?** Constraint is no-cloud. Fetching HTML via `fetch()` works for most sites; CORS is irrelevant since we're in a native app context (React Native's `fetch` doesn't enforce CORS). On web preview, CORS will block most recipe sites — that's acceptable since web is a secondary demo target and the feature is primarily for mobile.

## Work Packages

### WP1: Domain-layer recipe extractor (Commit 1) — ✅ COMPLETE

**Scope:** Pure TypeScript module in `packages/domain` — no UI, no React, no platform deps. Fully testable with Vitest.

**Files to create:**
- `packages/domain/src/recipe-scraper.ts` — core extraction logic
- `packages/domain/tests/recipe-scraper.test.ts` — unit tests with fixture HTML

**Module API:**
```typescript
interface ScrapedRecipe {
  name: string;
  ingredients: Array<{ raw: string; name: string; quantityText: string | null }>;
  notes: string | null;          // instructions summary or first paragraph
  prepMinutes: number | null;    // from PT30M ISO 8601 duration
  tags: string[];                // from recipeCategory + keywords
  imageUrl: string | null;       // og:image or Recipe.image
  sourceUrl: string;
  sourceHost: string;            // extracted hostname for display
}

/** Parse HTML string and extract recipe data. Returns null if no recipe found. */
function extractRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipe | null;

/** Parse ISO 8601 duration (PT30M, PT1H15M) into minutes. */
function parseDuration(iso: string): number | null;

/** Best-effort split of "2 cups diced chicken" → { name, quantityText }. */
function parseIngredientLine(raw: string): { name: string; quantityText: string | null };
```

**Key decisions:**
- HTML parsing via regex/string operations on `<script type="application/ld+json">` blocks — no heavy DOM parser dependency needed since JSON-LD is just JSON inside a script tag.
- `parseIngredientLine` uses a simple heuristic: leading quantity pattern (number + optional unit word) becomes `quantityText`, remainder becomes `name`. This covers 80%+ of recipe ingredients. Users can edit in the review screen.
- `parseDuration` handles ISO 8601 `PT__H__M` format. If both `prepTime` and `totalTime` exist, prefer `totalTime` as `prepMinutes`.
- Instructions go into `notes` as plain text (strip HTML tags, join steps with newlines, truncate to reasonable length).

**Export from domain index:**
- Add exports to `packages/domain/src/index.ts`

**Tests (≥10 cases):**
- JSON-LD with full Recipe object → extracts all fields
- JSON-LD with `@graph` array containing Recipe → finds it
- Multiple JSON-LD blocks (only one is Recipe) → picks correct one
- ISO 8601 duration parsing: PT30M, PT1H15M, PT2H, invalid string
- Ingredient line parsing: "2 cups flour", "1/2 lb chicken breast", "salt", "3 (14 oz) cans tomatoes"
- HTML with no JSON-LD → returns null
- HTML with JSON-LD but no Recipe type → returns null
- Malformed JSON in script tag → returns null (no throw)
- Real-world fixture: snapshot of an AllRecipes page (saved HTML fragment)

**Dependencies:** None (pure function, no new npm packages).

**Verification:** `cd packages/domain && npx vitest run` — all existing + new tests pass.

---

### WP2: Mobile URL-import screen + fetch hook (Commit 2) — ✅ COMPLETE

**Scope:** New screen and feature hook that let users paste a URL, fetch + extract, review the result, and save to SQLite.

**Files to create:**
- `apps/mobile/src/features/import/useUrlImport.ts` — fetch URL → extract → return ScrapedRecipe
- `apps/mobile/app/(tabs)/meals/url-import.tsx` — 3-step screen: paste URL → preview/edit → save

**Files to modify:**
- `apps/mobile/app/(tabs)/meals/index.tsx` — add "Import from URL" option (second FAB action or menu item)
- `apps/mobile/app/(tabs)/meals/_layout.tsx` — register `url-import` route if needed

**useUrlImport hook API:**
```typescript
interface UseUrlImportReturn {
  loading: boolean;
  error: string | null;
  recipe: ScrapedRecipe | null;
  fetchAndExtract: (url: string) => Promise<void>;
  reset: () => void;
}
```

**Screen flow:**
1. **URL input** — Text input + "Fetch" button. Validates URL format before fetching. Shows loading spinner during fetch.
2. **Preview** — If extraction succeeds, show extracted data in a read-only preview: meal name, ingredient count, prep time, tags, source link. "Edit & Save" button.
3. **Edit & Save** — Reuses the existing `useMealForm` hook, pre-populated with extracted data. User can edit anything before saving. `sourceUrl` and `sourceHost` are set automatically. On save, navigates back to meals list.
4. **Fallback** — If extraction fails, show friendly message + option to "Add manually" (navigates to edit screen with `sourceUrl` pre-filled).

**Entry points:**
- Meals index screen: add a secondary action alongside the FAB, or add an "Import URL" item to the header area near the existing file-import button.
- Direct navigation: `/(tabs)/meals/url-import`

**Platform notes:**
- On native (Android/iOS), `fetch(url)` works cross-origin. This is the primary target.
- On web, most recipe sites will CORS-block. Show a clear message: "URL import works on mobile devices. On web, use the JSON file import instead."

**Verification:**
- Manual test on Android Expo Go: paste an AllRecipes URL → see extracted meal → edit → save → appears in meals list with `sourceUrl` populated.
- Verify fallback: paste a non-recipe URL → see "no recipe found" → option to add manually.

---

### WP3: UI polish + detail screen source link + docs (Commit 3) — 🔲 DEFERRED

**Scope:** Small polish pass to surface the `sourceUrl` on the meal detail screen, update docs, and handle edge cases.

**Files to modify:**
- `apps/mobile/app/(tabs)/meals/[mealId].tsx` — Show source URL as a tappable link when present (using `Linking.openURL`). Display `sourceHost` as label (e.g., "From allrecipes.com").
- `docs/phase5-plan.md` — Mark WPs as complete.
- `docs/current-plan.md` — Update status.
- `docs/DEMO.md` — Add URL import to demo walkthrough.

**Files to create (optional):**
- `apps/mobile/tests/repos/url-import.test.ts` — Integration test: mock HTML → extract → create meal in test DB → verify `sourceUrl`/`sourceHost` stored.

**Verification:**
- All existing tests still pass (`npm test` at root + `cd apps/mobile && npx vitest run`)
- Meal detail screen shows source link for URL-imported meals, no link for manually-created meals
- Demo guide updated

## Sequencing and Dependencies

```
WP1 (domain extractor) ──→ WP2 (mobile screen + hook) ──→ WP3 (polish + docs)
     no deps                    depends on WP1                depends on WP1+WP2
```

All three are sequential. WP1 must land first since WP2 imports from it. Each is independently committable and demoable:
- After WP1: domain tests prove extraction works; no UI yet.
- After WP2: full user-facing feature on mobile.
- After WP3: polished, documented, source links visible.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Recipe sites change JSON-LD format | Low | Medium | Extraction is best-effort; manual fallback always available. Schema.org Recipe is a stable standard. |
| `fetch()` blocked by some sites (403, bot detection) | Medium | Low | Some sites (NYT Cooking) require auth. Show clear error message; user can still add manually. This is expected for a local parser approach. |
| Web preview CORS blocks | Certain | Low | Documented limitation; web users use file import. Feature is primarily for native mobile. |
| Ingredient parsing heuristic misses edge cases | Medium | Low | User reviews and edits before saving. Heuristic only needs to be "good enough" to save typing. |
| HTML string parsing fragile vs DOM parser | Low | Medium | JSON-LD is just JSON inside a predictable script tag; regex extraction of the script block is robust. We're not parsing arbitrary HTML structure. |

## Status Update (2026-04-12)

**Completed:**
- WP1: Domain extractor (`packages/domain/src/recipe-scraper.ts`) with unit tests
- WP2: Mobile URL import screen (`apps/mobile/app/(tabs)/meals/url-import.tsx`) with review/edit workflow
- Source metadata storage in meals table (no migration needed; schema already had columns)
- URL import works on native mobile (Android/iOS) via React Native fetch

**Known limitations:**
- Browser preview: CORS blocks most recipe sites. This is expected; web is a secondary demo target. File import remains the web fallback.
- Share-intent: Deferred to Phase 5b (requires custom dev build, not Expo Go compatible).
- Source link display on detail screen: Not yet implemented (WP3 polish step).

**Deferred to Phase 5b (future work):**
- Android share-intent receiver (requires custom dev build)
- Meal detail screen source link display and `Linking.openURL` integration
- Microdata/RDFa fallback parsing (JSON-LD covers 90%+ of sites)
- Image display for `imageUrl` field
- Native branding assets (PNG icons)
- Batch URL import

## Recommended First Commit

**Start with WP1** — the domain-layer extractor. It's:
- Zero risk (pure functions, no UI changes, no platform concerns)
- Fully testable in isolation
- Required by everything else
- ~150-200 lines of code + ~200 lines of tests
