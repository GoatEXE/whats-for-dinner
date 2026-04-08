import { state } from "./state.js";
import { elements } from "./elements.js";
import {
  apiFetch,
  fetchCurrentPlan,
  showStatus,
  escapeHtml,
} from "./helpers.js";
import {
  renderIngredientOptions,
  renderMeals,
  renderPantry,
  renderHistory,
  renderShoppingSelection,
  renderShoppingListResult,
  renderMatches,
  renderRandomResult,
} from "./renderers.js";
import {
  getNextMonday,
  formatWeeklyPlanText,
  renderWeeklyPlan,
  renderPlanHistory,
} from "./plan-renderers.js";

function createIngredientRow(values = {}) {
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

function ensureAtLeastOneIngredientRow() {
  if (elements.ingredientRows.children.length === 0) {
    elements.ingredientRows.appendChild(createIngredientRow());
  }
}

function resetMealForm() {
  state.editingMealId = null;
  elements.mealForm.reset();
  elements.ingredientRows.innerHTML = "";
  ensureAtLeastOneIngredientRow();
  elements.mealFormTitle.textContent = "Add meal";
  elements.cancelEditButton.classList.add("hidden");
}

function fillMealForm(meal) {
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

// ─── Tabs ─────────────────────────────────────────────────────────────

function switchTab(tabName) {
  state.activeTab = tabName;
  sessionStorage.setItem("activeTab", tabName);

  elements.tabBar.querySelectorAll(".tab-button").forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
  });
}

async function loadData() {
  const [meals, pantry, history, ingredients, plan, archivedPlans] =
    await Promise.all([
      apiFetch("/api/meals"),
      apiFetch("/api/pantry"),
      apiFetch("/api/history?limit=10"),
      apiFetch("/api/ingredients"),
      fetchCurrentPlan(),
      apiFetch("/api/weekly-plans/history?limit=20"),
    ]);

  state.meals = meals;
  state.pantry = pantry;
  state.history = history;
  state.ingredients = ingredients;
  state.currentPlan = plan;
  state.archivedPlans = archivedPlans;

  // Clean up stale shopping list selections — preserve overridden (archived) meals
  const activeMealIds = new Set(state.meals.map((meal) => meal.id));
  for (const id of state.shoppingMealIds) {
    if (!activeMealIds.has(id) && !state.shoppingMealOverrides.has(id)) {
      state.shoppingMealIds.delete(id);
    }
  }

  renderIngredientOptions();
  renderMeals();
  renderPantry();
  renderHistory();
  renderShoppingSelection();
  renderWeeklyPlan();
  renderPlanHistory();
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

async function saveMeal(event) {
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

async function addPantryItem(event) {
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

async function removePantryItem(ingredientId) {
  try {
    await apiFetch(`/api/pantry/items/${ingredientId}`, { method: "DELETE" });
    showStatus("Pantry item removed");
    await loadData();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function toggleFavorite(mealId, isFavorite) {
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

async function archiveMeal(mealId) {
  if (!window.confirm("Archive this meal?")) {
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

async function addHistory(mealId, source = "manual") {
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

async function runPantryMatch() {
  try {
    const result = await apiFetch("/api/suggestions/matches", {
      method: "POST",
      body: JSON.stringify({ useSavedPantry: true, includePartial: true }),
    });
    renderMatches(result);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function runAdHocMatch(event) {
  event.preventDefault();
  const formData = new FormData(elements.adHocMatchForm);
  const ingredientNames = String(formData.get("ingredientNames") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const result = await apiFetch("/api/suggestions/matches", {
      method: "POST",
      body: JSON.stringify({
        ingredientNames,
        favoritesOnly: formData.get("favoritesOnly") === "on",
        includePartial: formData.get("includePartial") === "on",
      }),
    });
    renderMatches(result);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function pickRandomMeal(event) {
  event.preventDefault();
  const formData = new FormData(elements.randomForm);
  const searchParams = new URLSearchParams({
    favoritesOnly: String(formData.get("favoritesOnly") === "on"),
    fullMatchOnly: String(formData.get("fullMatchOnly") === "on"),
    excludeServedWithinDays: String(
      formData.get("excludeServedWithinDays") || "0",
    ),
  });

  try {
    const result = await apiFetch(
      `/api/suggestions/random?${searchParams.toString()}`,
    );
    renderRandomResult(result);
  } catch (error) {
    renderRandomResult(null);
    showStatus(error.message, "error");
  }
}

function handleMealActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const mealId = Number(button.dataset.id);
  const meal = state.meals.find((item) => item.id === mealId);

  if (action === "edit" && meal) {
    fillMealForm(meal);
    return;
  }

  if (action === "favorite" && meal) {
    toggleFavorite(mealId, meal.isFavorite);
    return;
  }

  if (action === "archive") {
    archiveMeal(mealId);
    return;
  }

  if (action === "shop") {
    toggleShoppingMeal(mealId);
    return;
  }

  if (action === "serve") {
    addHistory(mealId, "manual");
  }
}

function toggleShoppingMeal(mealId) {
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

function clearShoppingSelection() {
  state.shoppingMealIds.clear();
  state.shoppingMealOverrides.clear();
  state.shoppingListResult = null;
  renderShoppingSelection();
  renderShoppingListResult(null);
  renderMeals();
}

async function generateShoppingList(event) {
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

async function copyShoppingList() {
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

function handleShoppingChipRemove(event) {
  const button = event.target.closest('button[data-action="remove-shopping"]');
  if (!button) {
    return;
  }

  toggleShoppingMeal(Number(button.dataset.id));
}

function handleShoppingResultActions(event) {
  const button = event.target.closest("#copy-shopping-list");
  if (!button) {
    return;
  }

  copyShoppingList();
}


async function createWeeklyPlan(weekStart) {
  if (!weekStart) {
    showStatus("Please enter a valid date", "error");
    return;
  }

  try {
    state.currentPlan = await apiFetch("/api/weekly-plans", {
      method: "POST",
      body: JSON.stringify({ weekStart }),
    });
    await loadData();
    showStatus("Weekly plan created");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function assignPlanSlot(day, mealId) {
  const body = { mealId };

  // When assigning a meal, include pending notes from DOM to avoid losing unsaved edits
  if (mealId !== null) {
    const notesInput = elements.weeklyPlanContent.querySelector(
      `input[data-action="plan-notes"][data-day="${day}"]`,
    );
    if (notesInput) {
      body.notes = notesInput.value.trim() || null;
    }
  }

  try {
    state.currentPlan = await apiFetch(
      `/api/weekly-plans/current/slots/${day}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    renderWeeklyPlan();
  } catch (error) {
    showStatus(error.message, "error");
    renderWeeklyPlan();
  }
}

async function fillPlanSlotRandom(day) {
  try {
    state.currentPlan = await apiFetch(
      `/api/weekly-plans/current/slots/${day}/random`,
      {
        method: "POST",
        body: JSON.stringify(state.weeklyAutofillOptions),
      },
    );
    renderWeeklyPlan();
    showStatus("Random meal assigned");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function servePlanSlot(day) {
  try {
    state.currentPlan = await apiFetch(
      `/api/weekly-plans/current/slots/${day}/serve`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    renderWeeklyPlan();
    await loadData();
    showStatus("Meal marked as served");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function generateShoppingListForCurrentPlan() {
  const slots = state.currentPlan.slots.filter(
    (slot) => slot.meal !== null,
  );
  const uniqueIds = [...new Set(slots.map((slot) => slot.meal.id))];

  // Sync shopping selection state and store plan meal summaries for display
  state.shoppingMealIds = new Set(uniqueIds);
  state.shoppingMealOverrides = new Map();
  slots.forEach((slot) => {
    state.shoppingMealOverrides.set(slot.meal.id, slot.meal);
  });
  state.shoppingListResult = null;

  renderShoppingSelection();
  renderMeals();

  // Read current shopping list form settings and generate
  const formData = new FormData(elements.shoppingListForm);
  const ingredientNames = String(formData.get("ingredientNames") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const payload = {
    mealIds: uniqueIds,
    useSavedPantry: formData.get("useSavedPantry") === "on",
    includeOptional: formData.get("includeOptional") === "on",
  };

  if (ingredientNames.length > 0) {
    payload.ingredientNames = ingredientNames;
  }

  const result = await apiFetch("/api/shopping-list/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  state.shoppingListResult = result;
  renderShoppingListResult(result);

  return result;
}

async function sendPlanToShoppingList() {
  if (!state.currentPlan) {
    return;
  }

  if (!state.currentPlan.slots.some((slot) => slot.meal !== null)) {
    showStatus("No meals planned yet", "error");
    return;
  }

  try {
    await generateShoppingListForCurrentPlan();
    showStatus("Shopping list generated from plan");
  } catch (error) {
    showStatus(error.message, "error");
  }

  switchTab("shop");
  document
    .querySelector("#shopping-list-panel")
    .scrollIntoView({ behavior: "smooth" });
}

async function copyPlanAndShoppingList() {
  if (!state.currentPlan) {
    return;
  }

  if (!state.currentPlan.slots.some((slot) => slot.meal !== null)) {
    showStatus("No meals planned yet", "error");
    return;
  }

  try {
    const result = await generateShoppingListForCurrentPlan();
    const planText = formatWeeklyPlanText(state.currentPlan);
    const combinedText = planText + "\n---\n\n" + result.copyText + "\n";
    await navigator.clipboard.writeText(combinedText);
    showStatus("Plan and shopping list copied to clipboard");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function handleWeeklyPlanActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const day = Number(button.dataset.day);

  if (action === "plan-create") {
    const input = elements.weeklyPlanContent.querySelector(
      "#plan-week-start",
    );
    createWeeklyPlan(input ? input.value : "");
    return;
  }

  if (action === "plan-autofill") {
    autofillPlan();
    return;
  }

  if (action === "plan-random") {
    fillPlanSlotRandom(day);
    return;
  }

  if (action === "plan-clear") {
    assignPlanSlot(day, null);
    return;
  }

  if (action === "plan-serve") {
    button.disabled = true;
    servePlanSlot(day);
    return;
  }

  if (action === "plan-share-pack") {
    copyPlanAndShoppingList();
    return;
  }

  if (action === "plan-shopping-list") {
    sendPlanToShoppingList();
    return;
  }

  if (action === "plan-copy") {
    copyWeeklyPlan();
  }
}

let pendingNoteSave = null;
let notesSaveTimer = null;
let notesSaveArgs = null;

function flushPendingNoteSave() {
  if (notesSaveTimer) {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = null;
  }
  if (notesSaveArgs) {
    const [day, mealId, notes] = notesSaveArgs;
    notesSaveArgs = null;
    savePlanSlotNotes(day, mealId, notes);
  }
}

async function savePlanSlotNotes(day, mealId, notes) {
  const savePromise = (async () => {
    try {
      state.currentPlan = await apiFetch(
        `/api/weekly-plans/current/slots/${day}`,
        {
          method: "PATCH",
          body: JSON.stringify({ mealId, notes: notes.trim() || null }),
        },
      );
      // Don't re-render — avoid stealing focus from other inputs
    } catch (error) {
      showStatus(error.message, "error");
      renderWeeklyPlan();
    }
  })();

  pendingNoteSave = savePromise;
  await savePromise;
  if (pendingNoteSave === savePromise) {
    pendingNoteSave = null;
  }
}

async function autofillPlan() {
  // Flush any debounced note save, then await in-flight save to prevent stale PATCH race
  flushPendingNoteSave();
  if (pendingNoteSave) {
    await pendingNoteSave;
  }

  const filters = { ...state.weeklyAutofillOptions };
  const hasAutofillFilters =
    filters.favoritesOnly ||
    filters.fullMatchOnly ||
    filters.excludeServedWithinDays > 0;

  try {
    const result = await apiFetch("/api/weekly-plans/current/autofill", {
      method: "POST",
      body: JSON.stringify(filters),
    });

    const { autofillResult, ...plan } = result;
    state.currentPlan = plan;
    renderWeeklyPlan();

    const { filledCount, skippedCount, emptyBeforeCount } = autofillResult;

    if (filledCount === 0 && emptyBeforeCount === 0) {
      showStatus("Plan is already full", "warning");
    } else if (filledCount > 0 && skippedCount === 0) {
      showStatus(
        `Filled ${filledCount} empty day${filledCount !== 1 ? "s" : ""}`,
      );
    } else if (filledCount > 0 && skippedCount > 0) {
      showStatus(
        `Filled ${filledCount} day${filledCount !== 1 ? "s" : ""} \u2014 not enough meals for the remaining ${skippedCount}`,
        "warning",
      );
    } else {
      showStatus(
        hasAutofillFilters
          ? "No meals available with the current autofill filters"
          : "No meals available to fill empty days",
        "warning",
      );
    }
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function handleWeeklyPlanChange(event) {
  const autofillFavorites = event.target.closest(
    'input[data-action="plan-autofill-favorites"]',
  );
  if (autofillFavorites) {
    state.weeklyAutofillOptions.favoritesOnly = autofillFavorites.checked;
    return;
  }

  const autofillFullMatch = event.target.closest(
    'input[data-action="plan-autofill-full-match"]',
  );
  if (autofillFullMatch) {
    state.weeklyAutofillOptions.fullMatchOnly = autofillFullMatch.checked;
    return;
  }

  const autofillExcludeDays = event.target.closest(
    'input[data-action="plan-autofill-exclude-days"]',
  );
  if (autofillExcludeDays) {
    const parsedValue = Number(autofillExcludeDays.value);
    state.weeklyAutofillOptions.excludeServedWithinDays =
      Number.isFinite(parsedValue) && parsedValue > 0
        ? Math.min(365, Math.floor(parsedValue))
        : 0;
    autofillExcludeDays.value = String(
      state.weeklyAutofillOptions.excludeServedWithinDays,
    );
    return;
  }

  const select = event.target.closest('select[data-action="plan-assign"]');
  if (select) {
    const day = Number(select.dataset.day);
    const mealId = select.value ? Number(select.value) : null;
    assignPlanSlot(day, mealId);
    return;
  }

  const notesInput = event.target.closest(
    'input[data-action="plan-notes"]',
  );
  if (notesInput) {
    const day = Number(notesInput.dataset.day);
    const mealIdStr = notesInput.dataset.mealId;
    const mealId = mealIdStr ? Number(mealIdStr) : null;
    clearTimeout(notesSaveTimer);
    notesSaveArgs = [day, mealId, notesInput.value];
    notesSaveTimer = setTimeout(() => {
      notesSaveArgs = null;
      savePlanSlotNotes(day, mealId, notesInput.value);
    }, 350);
  }
}

async function copyWeeklyPlan() {
  if (!state.currentPlan) {
    return;
  }

  const text = formatWeeklyPlanText(state.currentPlan);

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Weekly plan copied to clipboard");
  } catch {
    showStatus(
      "Failed to copy \u2014 try selecting the text manually",
      "error",
    );
  }
}

async function copyArchivedPlan() {
  if (!state.expandedPlanDetail) {
    return;
  }

  const text = formatWeeklyPlanText(state.expandedPlanDetail);

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Archived plan copied to clipboard");
  } catch {
    showStatus(
      "Failed to copy \u2014 try selecting the text manually",
      "error",
    );
  }
}


async function togglePlanDetail(planId) {
  if (state.expandedPlanId === planId) {
    state.expandedPlanId = null;
    state.expandedPlanDetail = null;
    renderPlanHistory();
    return;
  }

  // Show loading state immediately
  state.expandedPlanId = planId;
  state.expandedPlanDetail = null;
  renderPlanHistory();

  try {
    state.expandedPlanDetail = await apiFetch(
      `/api/weekly-plans/history/${planId}`,
    );
    renderPlanHistory();
  } catch (error) {
    state.expandedPlanId = null;
    state.expandedPlanDetail = null;
    renderPlanHistory();
    showStatus(error.message, "error");
  }
}

async function reusePlan(sourcePlanId) {
  const nextMonday = getNextMonday();
  const weekStart = window.prompt(
    "Reuse this plan as a starting point.\nEnter the Monday date for the new week (YYYY-MM-DD):",
    nextMonday,
  );
  if (!weekStart) {
    return;
  }

  const trimmed = weekStart.trim();

  if (state.currentPlan && state.currentPlan.weekStart !== trimmed) {
    if (
      !window.confirm(
        "This will archive your current weekly plan. Continue?",
      )
    ) {
      return;
    }
  }

  try {
    state.currentPlan = await apiFetch(
      `/api/weekly-plans/from/${sourcePlanId}`,
      {
        method: "POST",
        body: JSON.stringify({ weekStart: trimmed }),
      },
    );
    state.expandedPlanId = null;
    state.expandedPlanDetail = null;
    await loadData();
    showStatus("New plan created from past week");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function handlePlanHistoryActions(event) {
  const toggle = event.target.closest(
    '[data-action="toggle-plan-detail"]',
  );
  if (toggle) {
    togglePlanDetail(Number(toggle.dataset.id));
    return;
  }

  const reuse = event.target.closest('[data-action="plan-reuse"]');
  if (reuse) {
    reusePlan(Number(reuse.dataset.id));
    return;
  }

  if (
    event.target.closest('[data-action="plan-history-copy"]') &&
    state.expandedPlanDetail
  ) {
    copyArchivedPlan();
  }
}

function handleNewWeekPlan() {
  const nextMonday = getNextMonday();
  const weekStart = window.prompt(
    "Start a new weekly plan.\nEnter the Monday date (YYYY-MM-DD):",
    nextMonday,
  );
  if (!weekStart) {
    return;
  }

  createWeeklyPlan(weekStart.trim());
}

function handlePantryActions(event) {
  const button = event.target.closest('button[data-action="remove-pantry"]');
  if (!button) {
    return;
  }

  removePantryItem(Number(button.dataset.id));
}

async function init() {
  elements.mealForm.addEventListener("submit", saveMeal);
  elements.cancelEditButton.addEventListener("click", resetMealForm);
  elements.addIngredientRowButton.addEventListener("click", () => {
    elements.ingredientRows.appendChild(createIngredientRow());
  });
  elements.pantryForm.addEventListener("submit", addPantryItem);
  elements.mealsList.addEventListener("click", handleMealActions);
  elements.randomResult.addEventListener("click", handleMealActions);
  elements.pantryList.addEventListener("click", handlePantryActions);
  elements.matchPantryButton.addEventListener("click", runPantryMatch);
  elements.adHocMatchForm.addEventListener("submit", runAdHocMatch);
  elements.randomForm.addEventListener("submit", pickRandomMeal);
  document
    .querySelector("#picker-options-toggle")
    .addEventListener("click", () => {
      const panel = document.querySelector("#picker-options");
      const btn = document.querySelector("#picker-options-toggle");
      const open = panel.classList.toggle("hidden");
      btn.setAttribute("aria-expanded", String(!open));
      btn.textContent = open ? "Options \u25b8" : "Options \u25be";
    });
  elements.mealSearchInput.addEventListener("input", renderMeals);
  elements.shoppingListForm.addEventListener("submit", generateShoppingList);
  elements.clearShoppingSelection.addEventListener(
    "click",
    clearShoppingSelection,
  );
  elements.shoppingSelectedMeals.addEventListener(
    "click",
    handleShoppingChipRemove,
  );
  elements.shoppingListResult.addEventListener(
    "click",
    handleShoppingResultActions,
  );
  elements.weeklyPlanContent.addEventListener(
    "click",
    handleWeeklyPlanActions,
  );
  elements.weeklyPlanContent.addEventListener(
    "change",
    handleWeeklyPlanChange,
  );
  elements.weeklyPlanContent.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      event.target.matches('input[data-action="plan-notes"]')
    ) {
      event.target.blur();
    }
  });
  elements.newWeekPlanButton.addEventListener("click", handleNewWeekPlan);
  elements.planHistory.addEventListener("click", handlePlanHistoryActions);
  elements.planHistory.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      const toggle = event.target.closest(
        '[data-action="toggle-plan-detail"]',
      );
      if (toggle) {
        event.preventDefault();
        togglePlanDetail(Number(toggle.dataset.id));
      }
    }
  });
  elements.tabBar.addEventListener("click", (event) => {
    const btn = event.target.closest(".tab-button");
    if (btn) {
      switchTab(btn.dataset.tab);
    }
  });
  elements.tabBar.addEventListener("keydown", (event) => {
    const tabs = [...elements.tabBar.querySelectorAll(".tab-button")];
    const current = tabs.findIndex(
      (t) => t.dataset.tab === state.activeTab,
    );
    let next = -1;
    if (event.key === "ArrowRight") {
      next = (current + 1) % tabs.length;
    }
    if (event.key === "ArrowLeft") {
      next = (current - 1 + tabs.length) % tabs.length;
    }
    if (next >= 0) {
      event.preventDefault();
      switchTab(tabs[next].dataset.tab);
      tabs[next].focus();
    }
  });
  elements.refreshButton.addEventListener("click", async () => {
    try {
      await loadData();
      showStatus("Data refreshed");
    } catch (error) {
      showStatus(error.message, "error");
    }
  });

  resetMealForm();
  switchTab(state.activeTab);

  try {
    await loadData();
    await runPantryMatch();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

void init();
