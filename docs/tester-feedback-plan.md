# Tester Feedback Implementation Plan

Status: **approved** — decisions confirmed, ready for implementation.

## 1) Remove seed data — APPROVED

### Relevant files
- `apps/mobile/src/hooks/useDatabase.tsx`
- `apps/mobile/src/db/is-empty.ts`
- `apps/mobile/src/db/seed.ts`
- `apps/mobile/src/db/reset.ts`
- `apps/mobile/src/db/database.ts`
- `apps/mobile/app/(tabs)/meals/settings.tsx`
- `apps/mobile/tests/seed.test.ts`

### Decision
- Remove auto-seed entirely. First launch is a clean, empty database.
- Remove the "Reset to Sample Data" button from settings. No risk of accidental cookbook deletion.
- Delete `seed.ts`, `reset.ts`, `is-empty.ts` and all references.
- Remove/update any tests that depend on seed data.

### Complexity: Small

---

## 2) "Suggestions" button verbiage — APPROVED

### Relevant files
- `apps/mobile/app/(tabs)/shop/index.tsx`
- `apps/mobile/app/(tabs)/shop/suggestions.tsx`

### Decision
- Rename "Suggestions" button to **"What Can I Make?"** or **"Recipe Match"** — something that clearly communicates it finds recipes from your pantry, not pantry item suggestions.
- Update the accessibility label to match.

### Complexity: Tiny

---

## 3) "I have everything for this recipe" button — APPROVED

### Relevant files
- `apps/mobile/app/(tabs)/meals/[mealId].tsx`
- `apps/mobile/src/hooks/usePantry.ts`
- `apps/mobile/src/db/repos/pantry-repo.ts`

### Decision
- Add an **"I have everything for this recipe"** button on the meal detail screen.
- Tapping it bulk-adds all of that meal's ingredients to the pantry.
- No quick-add staples needed — just this single button.

### Complexity: Small-Medium

---

## 4) Shopping list check-off → auto-add/remove pantry — APPROVED

### Relevant files
- `apps/mobile/app/(tabs)/shop/index.tsx`
- `apps/mobile/src/hooks/usePantry.ts`
- `apps/mobile/src/db/repos/pantry-repo.ts`

### Decision
- Check = add to pantry (you bought it, now you have it).
- Uncheck = remove from pantry (undo).
- Derive checked state from actual pantry membership rather than local UI state.

### Complexity: Medium

---

## 5) Previous week data retention — NO CHANGES NEEDED

### Decision
- Confirmed by user: previous week data is retained in the DB. No UI changes needed.
- Tester just wanted to confirm data wasn't lost — it isn't.

---

## 6) Notes/instructions field — APPROVED

### Relevant files
- `apps/mobile/app/(tabs)/meals/[mealId].tsx`
- `apps/mobile/app/(tabs)/meals/edit.tsx`
- `apps/mobile/src/ui/MealFormFields.tsx`

### Decision
- Keep using the existing `notes` field — no schema change.
- Relabel “Notes” to “Instructions” on the meal detail screen.
- Ensure the notes/instructions field is **always visible and editable** in the edit form, even when empty (currently it may be hidden when there's no content).
- Source URL link on meal detail already works for URL-imported meals — no changes needed there.

### Complexity: Small

---

## Implementation order
1. Remove seed data + reset button (unblocks clean tester experience)
2. Suggestions button rename (tiny, instant clarity)
3. Shopping check-off → pantry sync (high-value UX)
4. “I have everything for this recipe” button (convenience)
5. Notes → Instructions relabel + always-editable (polish)
6. Previous week retention — no work needed
