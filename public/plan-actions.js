import { state } from "./state.js";
import { apiFetch, showStatus } from "./helpers.js";
import {
  getNextMonday,
  formatWeeklyPlanText,
  renderPlanHistory,
} from "./plan-renderers.js";

export async function copyWeeklyPlan() {
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

export async function copyArchivedPlan() {
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

export async function togglePlanDetail(planId) {
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

export async function reusePlan(sourcePlanId, loadData) {
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

export function handlePlanHistoryActions(event, loadData) {
  const toggle = event.target.closest(
    '[data-action="toggle-plan-detail"]',
  );
  if (toggle) {
    togglePlanDetail(Number(toggle.dataset.id));
    return;
  }

  const reuse = event.target.closest('[data-action="plan-reuse"]');
  if (reuse) {
    reusePlan(Number(reuse.dataset.id), loadData);
    return;
  }

  if (
    event.target.closest('[data-action="plan-history-copy"]') &&
    state.expandedPlanDetail
  ) {
    copyArchivedPlan();
  }
}

export function handleNewWeekPlan(createWeeklyPlan) {
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
