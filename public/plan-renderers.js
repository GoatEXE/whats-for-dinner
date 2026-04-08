import { state } from "./state.js";
import { elements } from "./elements.js";
import { escapeHtml } from "./helpers.js";

export function getNextMonday() {
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

function formatDateCompact(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

export function formatWeeklyPlanText(plan) {
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

export function renderWeeklyPlan() {
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

export function renderPlanHistory() {
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
