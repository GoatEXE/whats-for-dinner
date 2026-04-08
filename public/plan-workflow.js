import { state } from "./state.js";
import { elements } from "./elements.js";
import { apiFetch, showStatus } from "./helpers.js";
import { renderWeeklyPlan } from "./plan-renderers.js";
import { copyWeeklyPlan } from "./plan-actions.js";

export async function createWeeklyPlan(weekStart, loadData) {
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

export async function assignPlanSlot(day, mealId) {
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

export async function fillPlanSlotRandom(day) {
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

export async function servePlanSlot(day, loadData) {
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

let pendingNoteSave = null;
let notesSaveTimer = null;
let notesSaveArgs = null;

export function flushPendingNoteSave() {
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

export async function savePlanSlotNotes(day, mealId, notes) {
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

export async function autofillPlan() {
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

export function handleWeeklyPlanActions(event, deps) {
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
    createWeeklyPlan(input ? input.value : "", deps.loadData);
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
    servePlanSlot(day, deps.loadData);
    return;
  }

  if (action === "plan-share-pack") {
    deps.copyPlanAndShoppingList();
    return;
  }

  if (action === "plan-shopping-list") {
    deps.sendPlanToShoppingList();
    return;
  }

  if (action === "plan-copy") {
    copyWeeklyPlan();
  }
}

export function handleWeeklyPlanChange(event) {
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
