import { state } from "./state.js";
import { elements } from "./elements.js";
import { apiFetch, fetchCurrentPlan, showStatus } from "./helpers.js";
import {
  renderIngredientOptions,
  renderMeals,
  renderPantry,
  renderHistory,
  renderShoppingSelection,
  renderShoppingListResult,
} from "./renderers.js";
import {
  formatWeeklyPlanText,
  renderWeeklyPlan,
  renderPlanHistory,
} from "./plan-renderers.js";
import {
  runPantryMatch,
  runAdHocMatch,
  pickRandomMeal,
} from "./suggestions.js";
import {
  toggleShoppingMeal,
  clearShoppingSelection,
  generateShoppingList,
  handleShoppingChipRemove,
  handleShoppingResultActions,
} from "./shopping.js";
import {
  createIngredientRow,
  resetMealForm,
  fillMealForm,
  saveMeal,
  addPantryItem,
  toggleFavorite,
  archiveMeal,
  addHistory,
  handlePantryActions,
} from "./meals.js";
import {
  togglePlanDetail,
  handlePlanHistoryActions,
  handleNewWeekPlan,
} from "./plan-actions.js";
import {
  createWeeklyPlan,
  handleWeeklyPlanActions,
  handleWeeklyPlanChange,
} from "./plan-workflow.js";

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


function handleMealActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const mealId = Number(button.dataset.id);
  const meal = state.meals.find((item) => item.id === mealId);

  if (action === "edit" && meal) {
    fillMealForm(meal, switchTab);
    return;
  }

  if (action === "favorite" && meal) {
    toggleFavorite(mealId, meal.isFavorite, loadData);
    return;
  }

  if (action === "archive") {
    archiveMeal(mealId, loadData);
    return;
  }

  if (action === "shop") {
    toggleShoppingMeal(mealId);
    return;
  }

  if (action === "serve") {
    addHistory(mealId, "manual", loadData);
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


async function init() {
  elements.mealForm.addEventListener("submit", (e) => saveMeal(e, loadData));
  elements.cancelEditButton.addEventListener("click", resetMealForm);
  elements.addIngredientRowButton.addEventListener("click", () => {
    elements.ingredientRows.appendChild(createIngredientRow());
  });
  elements.pantryForm.addEventListener("submit", (e) =>
    addPantryItem(e, loadData),
  );
  elements.mealsList.addEventListener("click", handleMealActions);
  elements.randomResult.addEventListener("click", handleMealActions);
  elements.pantryList.addEventListener("click", (e) =>
    handlePantryActions(e, loadData),
  );
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
  const planDeps = {
    loadData,
    sendPlanToShoppingList,
    copyPlanAndShoppingList,
  };
  elements.weeklyPlanContent.addEventListener("click", (e) =>
    handleWeeklyPlanActions(e, planDeps),
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
  elements.newWeekPlanButton.addEventListener("click", () =>
    handleNewWeekPlan((weekStart) => createWeeklyPlan(weekStart, loadData)),
  );
  elements.planHistory.addEventListener("click", (e) =>
    handlePlanHistoryActions(e, loadData),
  );
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
