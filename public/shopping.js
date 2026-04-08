import { state } from "./state.js";
import { elements } from "./elements.js";
import { apiFetch, showStatus } from "./helpers.js";
import {
  renderShoppingSelection,
  renderShoppingListResult,
  renderMeals,
} from "./renderers.js";

export function toggleShoppingMeal(mealId) {
  if (state.shoppingMealIds.has(mealId)) {
    state.shoppingMealIds.delete(mealId);
    state.shoppingMealOverrides.delete(mealId);
  } else {
    state.shoppingMealIds.add(mealId);
  }

  state.shoppingListResult = null;
  renderShoppingSelection();
  renderShoppingListResult(null);
  renderMeals();
}

export function clearShoppingSelection() {
  state.shoppingMealIds.clear();
  state.shoppingMealOverrides.clear();
  state.shoppingListResult = null;
  renderShoppingSelection();
  renderShoppingListResult(null);
  renderMeals();
}

export async function generateShoppingList(event) {
  event.preventDefault();

  if (state.shoppingMealIds.size === 0) {
    showStatus("Select at least one meal first", "error");
    return;
  }

  const formData = new FormData(elements.shoppingListForm);
  const ingredientNames = String(formData.get("ingredientNames") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const payload = {
    mealIds: [...state.shoppingMealIds],
    useSavedPantry: formData.get("useSavedPantry") === "on",
    includeOptional: formData.get("includeOptional") === "on",
  };

  if (ingredientNames.length > 0) {
    payload.ingredientNames = ingredientNames;
  }

  try {
    const result = await apiFetch("/api/shopping-list/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.shoppingListResult = result;
    renderShoppingListResult(result);
    showStatus("Shopping list generated");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function copyShoppingList() {
  if (!state.shoppingListResult || !state.shoppingListResult.copyText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.shoppingListResult.copyText);
    showStatus("Shopping list copied to clipboard");
  } catch {
    showStatus(
      "Failed to copy \u2014 try selecting the text manually",
      "error",
    );
  }
}

export function handleShoppingChipRemove(event) {
  const button = event.target.closest('button[data-action="remove-shopping"]');
  if (!button) {
    return;
  }

  toggleShoppingMeal(Number(button.dataset.id));
}

export function handleShoppingResultActions(event) {
  const button = event.target.closest("#copy-shopping-list");
  if (!button) {
    return;
  }

  copyShoppingList();
}
