import { elements } from "./elements.js";
import { apiFetch, showStatus } from "./helpers.js";
import { renderMatches, renderRandomResult } from "./renderers.js";

export async function runPantryMatch() {
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

export async function runAdHocMatch(event) {
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

export async function pickRandomMeal(event) {
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
