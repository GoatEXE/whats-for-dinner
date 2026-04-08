import { elements } from "./elements.js";

export async function apiFetch(path, options = {}) {
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

export async function fetchCurrentPlan() {
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

export function showStatus(message, type = "success") {
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner ${type}`;

  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    elements.statusBanner.className = "status-banner hidden";
    elements.statusBanner.textContent = "";
  }, 3500);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
