const state = {
  meals: [],
  pantry: [],
  history: [],
  ingredients: [],
  editingMealId: null,
  shoppingMealIds: new Set(),
  shoppingListResult: null,
  shoppingMealOverrides: new Map(),
  currentPlan: null,
  weeklyAutofillOptions: {
    favoritesOnly: false,
    fullMatchOnly: false,
    excludeServedWithinDays: 0,
  },
  archivedPlans: [],
  expandedPlanId: null,
  expandedPlanDetail: null,
  activeTab: sessionStorage.getItem("activeTab") || "plan",
};

const elements = {
  statusBanner: document.querySelector("#status-banner"),
  refreshButton: document.querySelector("#refresh-button"),
  mealsList: document.querySelector("#meals-list"),
  mealStats: document.querySelector("#meal-stats"),
  mealSearchInput: document.querySelector("#meal-search-input"),
  mealForm: document.querySelector("#meal-form"),
  mealFormTitle: document.querySelector("#meal-form-title"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  ingredientRows: document.querySelector("#ingredient-rows"),
  addIngredientRowButton: document.querySelector("#add-ingredient-row-button"),
  pantryList: document.querySelector("#pantry-list"),
  pantryForm: document.querySelector("#pantry-form"),
  matchesResult: document.querySelector("#matches-result"),
  matchPantryButton: document.querySelector("#match-pantry-button"),
  adHocMatchForm: document.querySelector("#ad-hoc-match-form"),
  randomForm: document.querySelector("#random-form"),
  randomResult: document.querySelector("#random-result"),
  historyList: document.querySelector("#history-list"),
  ingredientOptions: document.querySelector("#ingredient-options"),
  shoppingSelectedMeals: document.querySelector("#shopping-selected-meals"),
  shoppingListForm: document.querySelector("#shopping-list-form"),
  shoppingListResult: document.querySelector("#shopping-list-result"),
  clearShoppingSelection: document.querySelector("#clear-shopping-selection"),
  weeklyPlanContent: document.querySelector("#weekly-plan-content"),
  newWeekPlanButton: document.querySelector("#new-week-plan-button"),
  planHistory: document.querySelector("#plan-history"),
  tabBar: document.querySelector(".tab-bar"),
};

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data;
}

async function fetchCurrentPlan() {
  const response = await fetch("/api/weekly-plans/current", {
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data;
}

function showStatus(message, type = "success") {
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner ${type}`;

  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    elements.statusBanner.className = "status-banner hidden";
    elements.statusBanner.textContent = "";
  }, 3500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function renderIngredientOptions() {
  elements.ingredientOptions.innerHTML = state.ingredients
    .map(
      (ingredient) =>
        `<option value="${escapeHtml(ingredient.name)}"></option>`,
    )
    .join("");
}

function renderMeals() {
  const query = elements.mealSearchInput.value.trim().toLowerCase();
  const meals = state.meals.filter((meal) => {
    if (!query) {
      return true;
    }

    return (
      meal.name.toLowerCase().includes(query) ||
      (meal.notes ?? "").toLowerCase().includes(query)
    );
  });

  const favoriteCount = state.meals.filter((meal) => meal.isFavorite).length;
  elements.mealStats.innerHTML = `
    <span class="stat-pill">${state.meals.length} active meals</span>
    <span class="stat-pill">${favoriteCount} favorites</span>
    <span class="stat-pill">${state.pantry.length} pantry items</span>
  `;

  if (meals.length === 0) {
    elements.mealsList.innerHTML =
      '<div class="empty-state">No meals found.</div>';
    return;
  }

  elements.mealsList.innerHTML = meals
    .map((meal) => {
      const ingredientMarkup = meal.ingredients
        .map(
          (ingredient) =>
            `${escapeHtml(ingredient.name)}${ingredient.isOptional ? ' <span class="muted">(optional)</span>' : ""}`,
        )
        .join(", ");
      const tagMarkup = meal.tags
        .map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`)
        .join(" ");

      return `
        <article class="meal-card">
          <header>
            <div>
              <h3>${escapeHtml(meal.name)}</h3>
              <div class="badges">
                ${meal.isFavorite ? '<span class="badge favorite">Favorite</span>' : ""}
                ${tagMarkup}
              </div>
            </div>
            <span class="muted">${meal.prepMinutes ? `${meal.prepMinutes} min` : "No prep time set"}</span>
          </header>
          <p>${escapeHtml(meal.notes ?? "No notes yet.")}</p>
          <p class="muted"><strong>Ingredients:</strong> ${ingredientMarkup}</p>
          <div class="actions-row">
            <button type="button" data-action="favorite" data-id="${meal.id}" class="secondary" aria-label="${meal.isFavorite ? "Unfavorite" : "Favorite"} ${escapeHtml(meal.name)}">${meal.isFavorite ? "Unfavorite" : "Favorite"}</button>
            <button type="button" data-action="edit" data-id="${meal.id}" class="secondary" aria-label="Edit ${escapeHtml(meal.name)}">Edit</button>
            <button type="button" data-action="serve" data-id="${meal.id}" aria-label="Serve ${escapeHtml(meal.name)} tonight">Serve tonight</button>
            <button type="button" data-action="shop" data-id="${meal.id}" class="${state.shoppingMealIds.has(meal.id) ? "" : "secondary"}" aria-label="${state.shoppingMealIds.has(meal.id) ? "Remove" : "Add"} ${escapeHtml(meal.name)} ${state.shoppingMealIds.has(meal.id) ? "from" : "to"} shopping list">${state.shoppingMealIds.has(meal.id) ? "✓ On list" : "Add to list"}</button>
            <button type="button" data-action="archive" data-id="${meal.id}" class="danger" aria-label="Archive ${escapeHtml(meal.name)}">Archive</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPantry() {
  if (state.pantry.length === 0) {
    elements.pantryList.innerHTML =
      '<li class="empty-state">Pantry is empty.</li>';
    return;
  }

  elements.pantryList.innerHTML = state.pantry
    .map(
      (item) => `
        <li class="list-item">
          <div class="panel-header compact">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="muted">${escapeHtml(item.quantityText ?? "No quantity note")}</div>
            </div>
            <button type="button" class="danger" data-action="remove-pantry" data-id="${item.ingredientId}" aria-label="Remove ${escapeHtml(item.name)} from pantry">Remove</button>
          </div>
        </li>
      `,
    )
    .join("");
}

function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML =
      '<li class="empty-state">No meal history yet.</li>';
    return;
  }

  elements.historyList.innerHTML = state.history
    .map(
      (item) => `
        <li class="list-item">
          <div class="panel-header compact">
            <div>
              <strong>${escapeHtml(item.mealName)}</strong>
              <div class="muted">${escapeHtml(item.servedOn)} · ${escapeHtml(item.source)}</div>
            </div>
            ${item.isFavorite ? '<span class="badge favorite">Favorite</span>' : ""}
          </div>
        </li>
      `,
    )
    .join("");
}

function renderShoppingSelection() {
  const hasMeals = state.shoppingMealIds.size > 0;

  elements.clearShoppingSelection.classList.toggle("hidden", !hasMeals);
  elements.shoppingListForm.classList.toggle("hidden", !hasMeals);

  if (!hasMeals) {
    elements.shoppingSelectedMeals.className = "empty-state";
    elements.shoppingSelectedMeals.innerHTML =
      "No meals selected yet \u2014 use the <strong>Add to list</strong> button on meal cards below.";
    elements.shoppingListResult.innerHTML = "";
    state.shoppingListResult = null;
    return;
  }

  // Build display list: active meals + overrides for archived plan meals
  const activeMealMap = new Map(state.meals.map((m) => [m.id, m]));
  const displayMeals = [];

  for (const id of state.shoppingMealIds) {
    const active = activeMealMap.get(id);
    if (active) {
      displayMeals.push({
        id: active.id,
        name: active.name,
        isArchived: false,
      });
    } else {
      const override = state.shoppingMealOverrides.get(id);
      if (override) {
        displayMeals.push({
          id: override.id,
          name: override.name,
          isArchived: true,
        });
      }
    }
  }

  elements.shoppingSelectedMeals.className = "shopping-meal-chips";
  elements.shoppingSelectedMeals.innerHTML = displayMeals
    .map(
      (meal) => `
        <span class="shopping-chip">
          ${escapeHtml(meal.name)}${meal.isArchived ? ' <span class="muted">(archived)</span>' : ""}
          <button type="button" data-action="remove-shopping" data-id="${meal.id}" class="chip-remove" aria-label="Remove ${escapeHtml(meal.name)}">&times;</button>
        </span>
      `,
    )
    .join("");
}

function renderShoppingListResult(result) {
  if (!result) {
    elements.shoppingListResult.innerHTML = "";
    return;
  }

  let html = '<div class="shopping-list-results">';

  html += `<div class="stats-row spaced-bottom">
    <span class="stat-pill">${result.summary.selectedMealCount} meal${result.summary.selectedMealCount !== 1 ? "s" : ""}</span>
    <span class="stat-pill">${result.summary.requiredToBuyCount} to buy</span>
    <span class="stat-pill">${result.summary.requiredOnHandCount} on hand</span>
    ${result.summary.optionalToBuyCount > 0 ? `<span class="stat-pill">${result.summary.optionalToBuyCount} optional</span>` : ""}
  </div>`;

  html += "<h3>Need to buy</h3>";
  if (result.requiredToBuy.length === 0) {
    html += '<p class="muted">Everything is on hand!</p>';
  } else {
    html += '<ul class="list">';
    result.requiredToBuy.forEach((item) => {
      html += `<li class="list-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">${escapeHtml(item.quantityHints.join("; "))}</div>
      </li>`;
    });
    html += "</ul>";
  }

  if (result.requiredOnHand.length > 0) {
    html += "<h3>Already on hand</h3>";
    html += '<ul class="list">';
    result.requiredOnHand.forEach((item) => {
      html += `<li class="list-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">${escapeHtml(item.quantityHints.join("; "))}</div>
      </li>`;
    });
    html += "</ul>";
  }

  if (result.optionalToBuy.length > 0) {
    html += "<h3>Optional</h3>";
    html += '<ul class="list">';
    result.optionalToBuy.forEach((item) => {
      html += `<li class="list-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">${escapeHtml(item.quantityHints.join("; "))}</div>
      </li>`;
    });
    html += "</ul>";
  }

  html += `<div class="shopping-copy-area">
    <button type="button" id="copy-shopping-list" class="secondary" aria-label="Copy shopping list to clipboard">Copy to clipboard</button>
    <pre class="shopping-copy-text">${escapeHtml(result.copyText)}</pre>
  </div>`;

  html += "</div>";

  elements.shoppingListResult.innerHTML = html;
}

function renderMatches(result) {
  if (!result || result.matches.length === 0) {
    elements.matchesResult.className = "result-list empty-state";
    elements.matchesResult.textContent =
      "No meals matched that ingredient set.";
    return;
  }

  elements.matchesResult.className = "result-list";
  elements.matchesResult.innerHTML = result.matches
    .map((match) => {
      const missing = match.missingRequiredIngredients
        .map((ingredient) => ingredient.name)
        .join(", ");
      const optional = match.matchedOptionalIngredients
        .map((ingredient) => ingredient.name)
        .join(", ");
      return `
        <article class="match-card">
          <header>
            <div>
              <h3>${escapeHtml(match.name)}</h3>
              <div class="badges">
                <span class="badge ${match.isFullMatch ? "full" : "partial"}">${match.isFullMatch ? "Full match" : "Partial match"}</span>
                ${match.isFavorite ? '<span class="badge favorite">Favorite</span>' : ""}
              </div>
            </div>
            <span class="muted">${Math.round(match.matchPercentage * 100)}% ready</span>
          </header>
          <div class="meta-row">
            <span class="stat-pill">${match.matchedRequiredCount}/${match.requiredIngredientCount} required ingredients</span>
            <span class="stat-pill">Need ${match.shoppingNeededCount}</span>
          </div>
          ${missing ? `<p><span class="badge missing">Missing</span> ${escapeHtml(missing)}</p>` : '<p><span class="badge full">Ready to cook</span></p>'}
          ${optional ? `<p class="muted">Optional available: ${escapeHtml(optional)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderRandomResult(result) {
  if (!result) {
    elements.randomResult.className = "result-card empty-state";
    elements.randomResult.textContent = "No meal picked yet.";
    return;
  }

  const meal = result.meal;
  elements.randomResult.className = "result-card";
  elements.randomResult.innerHTML = `
    <header>
      <div>
        <h3>${escapeHtml(meal.name)}</h3>
        <div class="badges">
          ${meal.isFavorite ? '<span class="badge favorite">Favorite</span>' : ""}
          ${meal.tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join(" ")}
        </div>
      </div>
      <span class="muted">${result.candidateCount} candidates</span>
    </header>
    <p>${escapeHtml(meal.notes ?? "No notes yet.")}</p>
    <div class="actions-row">
      <button type="button" data-action="serve" data-id="${meal.id}" aria-label="Serve ${escapeHtml(meal.name)}">Serve this meal</button>
      <button type="button" data-action="edit" data-id="${meal.id}" class="secondary" aria-label="Edit ${escapeHtml(meal.name)}">Edit</button>
    </div>
  `;
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

// ─── Weekly Plan ─────────────────────────────────────────────────────

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diff,
  );
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderWeeklyPlan() {
  const plan = state.currentPlan;

  if (!plan) {
    const defaultMonday = getNextMonday();
    elements.newWeekPlanButton.classList.add("hidden");
    elements.weeklyPlanContent.innerHTML = `
      <p class="empty-state">No active weekly plan.</p>
      <div class="inline-form">
        <label>
          Week starting (Monday)
          <input type="date" id="plan-week-start" value="${defaultMonday}" />
        </label>
        <button type="button" data-action="plan-create">Create plan</button>
      </div>
    `;
    return;
  }

  elements.newWeekPlanButton.classList.remove("hidden");

  const plannedMealCount = plan.slots.filter(
    (slot) => slot.meal !== null,
  ).length;

  const slotsHtml = plan.slots
    .map((slot) => {
      const hasMeal = slot.meal !== null;

      let mealDisplay;
      if (!hasMeal) {
        mealDisplay = '<span class="muted">Empty</span>';
      } else {
        const badges = [
          slot.meal.isFavorite
            ? '<span class="badge favorite">\u2605</span>'
            : "",
          slot.meal.isArchived
            ? '<span class="badge missing">Archived</span>'
            : "",
          slot.served ? '<span class="badge full">Served</span>' : "",
        ]
          .filter(Boolean)
          .join(" ");
        mealDisplay = `<strong>${escapeHtml(slot.meal.name)}</strong> ${badges}`;
      }

      const mealOptions = state.meals
        .map(
          (m) =>
            `<option value="${m.id}" ${hasMeal && slot.meal.id === m.id ? "selected" : ""}>${escapeHtml(m.name)}${m.isFavorite ? " \u2605" : ""}</option>`,
        )
        .join("");

      const archivedOption =
        hasMeal && slot.meal.isArchived
          ? `<option value="${slot.meal.id}" selected disabled>${escapeHtml(slot.meal.name)} (archived)</option>`
          : "";

      const clearButton = hasMeal
        ? `<button type="button" data-action="plan-clear" data-day="${slot.day}" class="secondary" aria-label="Clear ${escapeHtml(slot.label)}">Clear</button>`
        : "";

      const serveButton =
        hasMeal && !slot.served
          ? `<button type="button" data-action="plan-serve" data-day="${slot.day}" aria-label="Serve ${escapeHtml(slot.label)} meal">Serve</button>`
          : "";

      return `
        <div class="plan-slot ${slot.served ? "served" : ""}">
          <div class="plan-slot-day">
            <strong>${escapeHtml(slot.label)}</strong>
            <span class="muted">${escapeHtml(slot.date)}</span>
          </div>
          <div class="plan-slot-meal">${mealDisplay}</div>
          <div class="plan-slot-actions">
            <select data-action="plan-assign" data-day="${slot.day}" aria-label="Pick meal for ${escapeHtml(slot.label)}">
              <option value="">\u2014 Pick \u2014</option>
              ${archivedOption}
              ${mealOptions}
            </select>
            <button type="button" data-action="plan-random" data-day="${slot.day}" class="secondary" aria-label="Random meal for ${escapeHtml(slot.label)}">Random</button>
            ${clearButton}
            ${serveButton}
          </div>
          <input class="plan-slot-notes" data-action="plan-notes" data-day="${slot.day}" data-meal-id="${hasMeal ? slot.meal.id : ''}" placeholder="Add a note\u2026" value="${escapeHtml(slot.notes ?? '')}" aria-label="Note for ${escapeHtml(slot.label)}" />
        </div>
      `;
    })
    .join("");

  const hasEmptySlots = plan.slots.some((slot) => slot.meal === null);

  elements.weeklyPlanContent.innerHTML = `
    <div class="stats-row spaced-bottom">
      <span class="stat-pill">Week of ${escapeHtml(plan.weekStart)}</span>
      <span class="stat-pill">${plannedMealCount}/7 meals planned</span>
    </div>
    ${hasEmptySlots ? `<form class="inline-form spaced-bottom">
      <label class="checkbox-row"><input type="checkbox" data-action="plan-autofill-favorites" ${state.weeklyAutofillOptions.favoritesOnly ? "checked" : ""} /> Favorites only</label>
      <label class="checkbox-row"><input type="checkbox" data-action="plan-autofill-full-match" ${state.weeklyAutofillOptions.fullMatchOnly ? "checked" : ""} /> Pantry-ready only</label>
      <label>
        Avoid recent meals
        <input type="number" data-action="plan-autofill-exclude-days" min="0" max="365" value="${state.weeklyAutofillOptions.excludeServedWithinDays}" aria-label="Avoid recently served meals within days" />
        days
      </label>
      <button type="button" data-action="plan-autofill" class="secondary">Fill empty days</button>
    </form>` : ""}
    <div class="plan-slots">${slotsHtml}</div>
    ${plannedMealCount > 0 ? '<div class="plan-footer"><button type="button" data-action="plan-share-pack">Copy plan & shopping list</button> <button type="button" data-action="plan-shopping-list" class="secondary">Generate shopping list</button> <button type="button" data-action="plan-copy" class="secondary">Copy plan</button></div>' : ""}
  `;
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

// ─── Plan History ────────────────────────────────────────────────────

function formatDateCompact(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatWeeklyPlanText(plan) {
  const weekLabel = formatDateShort(plan.weekStart);
  const lines = [`Dinner plan \u2014 week of ${weekLabel}`, ""];

  for (const slot of plan.slots) {
    const dayPart = slot.label.padEnd(9);
    const datePart = formatDateCompact(slot.date);

    if (!slot.meal) {
      lines.push(`${dayPart} ${datePart}  (no plan)`);
      continue;
    }

    let mealPart = slot.meal.name;
    if (slot.served) {
      mealPart += " \u2713";
    }
    if (slot.meal.isFavorite) {
      mealPart += " \u2605";
    }
    if (slot.meal.isArchived) {
      mealPart += " (archived)";
    }
    if (slot.notes) {
      mealPart += ` \u2014 ${slot.notes}`;
    }

    lines.push(`${dayPart} ${datePart}  ${mealPart}`);
  }

  return lines.join("\n") + "\n";
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

function formatDateShort(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderPlanSlotsSummary(slots) {
  return slots
    .map((slot) => {
      const hasMeal = slot.meal !== null;

      let mealHtml;
      if (!hasMeal) {
        mealHtml = '<span class="muted">\u2014</span>';
      } else {
        const badges = [
          slot.meal.isFavorite
            ? '<span class="badge favorite">\u2605</span>'
            : "",
          slot.meal.isArchived
            ? '<span class="badge missing">Archived</span>'
            : "",
          slot.served ? '<span class="badge full">Served</span>' : "",
        ]
          .filter(Boolean)
          .join(" ");
        const notesHtml = slot.notes
          ? ` <span class="muted">\u2014 ${escapeHtml(slot.notes)}</span>`
          : "";
        mealHtml = `${escapeHtml(slot.meal.name)} ${badges}${notesHtml}`;
      }

      return `
        <div class="plan-history-slot">
          <span class="plan-history-slot-day">${escapeHtml(slot.label.slice(0, 3))}</span>
          <span class="muted">${escapeHtml(slot.date)}</span>
          <span>${mealHtml}</span>
        </div>
      `;
    })
    .join("");
}

function renderPlanHistory() {
  if (state.archivedPlans.length === 0) {
    elements.planHistory.innerHTML = "";
    return;
  }

  elements.planHistory.innerHTML = `
    <div class="plan-history-section">
      <h3>Past plans</h3>
      <ul class="list">
        ${state.archivedPlans
          .map((plan) => {
            const isExpanded = state.expandedPlanId === plan.id;
            const detail = isExpanded ? state.expandedPlanDetail : null;

            let detailHtml = "";
            if (isExpanded) {
              detailHtml = detail
                ? `<div class="plan-history-detail">
                    ${renderPlanSlotsSummary(detail.slots)}
                    <div class="actions-row">
                      <button type="button" data-action="plan-reuse" data-id="${plan.id}" class="secondary" aria-label="Reuse week of ${escapeHtml(formatDateShort(plan.weekStart))}">Use as starting point</button>
                      <button type="button" data-action="plan-history-copy" class="secondary" aria-label="Copy week of ${escapeHtml(formatDateShort(plan.weekStart))}">Copy plan</button>
                    </div>
                  </div>`
                : '<div class="plan-history-detail"><span class="muted">Loading\u2026</span></div>';
            }

            return `
              <li class="list-item">
                <div class="panel-header compact plan-history-toggle" data-action="toggle-plan-detail" data-id="${plan.id}" role="button" tabindex="0" aria-expanded="${isExpanded}">
                  <div>
                    <strong>Week of ${escapeHtml(formatDateShort(plan.weekStart))}</strong>
                    <div class="muted">Created ${escapeHtml(formatDateShort(plan.createdAt.slice(0, 10)))}</div>
                  </div>
                  <span class="badge">${isExpanded ? "\u25be Hide" : "\u25b8 View"}</span>
                </div>
                ${detailHtml}
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
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
