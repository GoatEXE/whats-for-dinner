import { state } from "./state.js";
import { elements } from "./elements.js";
import { apiFetch, showStatus, escapeHtml } from "./helpers.js";
import { confirm } from "./dialog.js";

export function createIngredientRow(values = {}) {
  const row = document.createElement("div");
  row.className = "ingredient-row";
  row.innerHTML = `
    <label>
      Ingredient
      <input list="ingredient-options" name="ingredientName" value="${escapeHtml(values.name ?? "")}" placeholder="Ingredient" />
    </label>
    <label>
      Quantity note
      <input name="quantityText" value="${escapeHtml(values.quantityText ?? "")}" placeholder="e.g. 1 lb" />
    </label>
    <label class="checkbox-row">
      <input type="checkbox" name="isOptional" ${values.isOptional ? "checked" : ""} />
      Optional
    </label>
    <button type="button" class="secondary" aria-label="Remove ${escapeHtml(values.name || 'ingredient')}">Remove</button>
  `;

  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    ensureAtLeastOneIngredientRow();
  });

  return row;
}

export function ensureAtLeastOneIngredientRow() {
  if (elements.ingredientRows.children.length === 0) {
    elements.ingredientRows.appendChild(createIngredientRow());
  }
}

export function resetMealForm() {
  state.editingMealId = null;
  elements.mealForm.reset();
  elements.ingredientRows.innerHTML = "";
  ensureAtLeastOneIngredientRow();
  elements.mealFormTitle.textContent = "Add meal";
  elements.cancelEditButton.classList.add("hidden");
}

export function fillMealForm(meal, switchTab) {
  state.editingMealId = meal.id;
  elements.mealForm.name.value = meal.name;
  elements.mealForm.prepMinutes.value = meal.prepMinutes ?? "";
  elements.mealForm.notes.value = meal.notes ?? "";
  elements.mealForm.tags.value = meal.tags.join(", ");
  elements.mealForm.isFavorite.checked = meal.isFavorite;
  elements.ingredientRows.innerHTML = "";
  meal.ingredients.forEach((ingredient) => {
    elements.ingredientRows.appendChild(createIngredientRow(ingredient));
  });
  ensureAtLeastOneIngredientRow();
  elements.mealFormTitle.textContent = `Edit meal: ${meal.name}`;
  elements.cancelEditButton.classList.remove("hidden");
  switchTab("meals");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectMealPayload() {
  const ingredientRows = [
    ...elements.ingredientRows.querySelectorAll(".ingredient-row"),
  ]
    .map((row) => ({
      name: row.querySelector('[name="ingredientName"]').value.trim(),
      quantityText: row.querySelector('[name="quantityText"]').value.trim(),
      isOptional: row.querySelector('[name="isOptional"]').checked,
    }))
    .filter((ingredient) => ingredient.name);

  return {
    name: elements.mealForm.name.value.trim(),
    prepMinutes: elements.mealForm.prepMinutes.value
      ? Number(elements.mealForm.prepMinutes.value)
      : null,
    notes: elements.mealForm.notes.value.trim() || null,
    isFavorite: elements.mealForm.isFavorite.checked,
    tags: elements.mealForm.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    ingredients: ingredientRows,
  };
}

export async function saveMeal(event, loadData) {
  event.preventDefault();
  const payload = collectMealPayload();

  try {
    if (state.editingMealId) {
      await apiFetch(`/api/meals/${state.editingMealId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showStatus("Meal updated");
    } else {
      await apiFetch("/api/meals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showStatus("Meal created");
    }

    resetMealForm();
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function addPantryItem(event, loadData) {
  event.preventDefault();
  const formData = new FormData(elements.pantryForm);
  const payload = {
    name: String(formData.get("name")).trim(),
    quantityText: String(formData.get("quantityText") || "").trim() || null,
  };

  try {
    await apiFetch("/api/pantry/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    elements.pantryForm.reset();
    showStatus("Pantry updated");
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function removePantryItem(ingredientId, loadData) {
  try {
    await apiFetch(`/api/pantry/items/${ingredientId}`, { method: "DELETE" });
    showStatus("Pantry item removed");
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function toggleFavorite(mealId, isFavorite, loadData) {
  try {
    await apiFetch(`/api/meals/${mealId}/favorite`, {
      method: "POST",
      body: JSON.stringify({ isFavorite: !isFavorite }),
    });
    showStatus("Favorite updated");
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function archiveMeal(mealId, loadData) {
  const ok = await confirm("Archive meal", "Archive this meal?");
  if (!ok) {
    return;
  }

  try {
    await apiFetch(`/api/meals/${mealId}`, { method: "DELETE" });
    showStatus("Meal archived");
    if (state.editingMealId === mealId) {
      resetMealForm();
    }
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export async function addHistory(mealId, source, loadData) {
  try {
    await apiFetch("/api/history", {
      method: "POST",
      body: JSON.stringify({ mealId, source }),
    });
    showStatus("Saved to history");
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

export function handlePantryActions(event, loadData) {
  const button = event.target.closest('button[data-action="remove-pantry"]');
  if (!button) {
    return;
  }

  removePantryItem(Number(button.dataset.id), loadData);
}

export function exportMeals() {
  window.open("/api/meals/export");
}

export async function importMeals(event, loadData) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const result = await apiFetch("/api/meals/import", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const parts = [];
    if (result.imported > 0) {
      parts.push(`${result.imported} imported`);
    }
    if (result.skipped > 0) {
      parts.push(`${result.skipped} skipped`);
    }
    if (result.failed > 0) {
      parts.push(`${result.failed} failed`);
    }

    const type = result.failed > 0 ? "warning" : "success";
    showStatus(parts.join(", ") || "No meals to import", type);
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }

  event.target.value = "";
}
