import { state } from "./state.js";
import { elements } from "./elements.js";
import { escapeHtml } from "./helpers.js";

export function renderIngredientOptions() {
  elements.ingredientOptions.innerHTML = state.ingredients
    .map(
      (ingredient) =>
        `<option value="${escapeHtml(ingredient.name)}"></option>`,
    )
    .join("");
}

export function renderMeals() {
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
            <button type="button" data-action="shop" data-id="${meal.id}" class="${state.shoppingMealIds.has(meal.id) ? "" : "secondary"}" aria-label="${state.shoppingMealIds.has(meal.id) ? "Remove" : "Add"} ${escapeHtml(meal.name)} ${state.shoppingMealIds.has(meal.id) ? "from" : "to"} shopping list">${state.shoppingMealIds.has(meal.id) ? "\u2713 On list" : "Add to list"}</button>
            <button type="button" data-action="archive" data-id="${meal.id}" class="danger" aria-label="Archive ${escapeHtml(meal.name)}">Archive</button>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderPantry() {
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

export function renderHistory() {
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
              <div class="muted">${escapeHtml(item.servedOn)} \u00b7 ${escapeHtml(item.source)}</div>
            </div>
            ${item.isFavorite ? '<span class="badge favorite">Favorite</span>' : ""}
          </div>
        </li>
      `,
    )
    .join("");
}

export function renderShoppingSelection() {
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

export function renderShoppingListResult(result) {
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

export function renderMatches(result) {
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

export function renderRandomResult(result) {
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
