/**
 * Minimal in-app dialog module replacing window.confirm / window.prompt.
 * Returns Promises so callers can await user input.
 * Dialogs are scriptable via DOM selectors for Playwright tests.
 */

const overlay = document.querySelector("#dialog-overlay");
const dialogBox = overlay.querySelector(".dialog-box");
const titleEl = overlay.querySelector(".dialog-title");
const bodyEl = overlay.querySelector(".dialog-body");
const inputLabel = overlay.querySelector(".dialog-input-label");
const inputHint = overlay.querySelector(".dialog-input-hint");
const inputEl = overlay.querySelector(".dialog-input");
const confirmBtn = overlay.querySelector(".dialog-confirm");
const cancelBtn = overlay.querySelector(".dialog-cancel");

let resolveFn = null;
let previousFocus = null;
let inputKeyHandler = null;

// ─── Focus trap ──────────────────────────────────────────────────────

function getFocusable() {
  return [...dialogBox.querySelectorAll(
    'button, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => !el.closest(".hidden") && !el.disabled);
}

function trapFocus(e) {
  if (e.key !== "Tab") {
    return;
  }
  const focusable = getFocusable();
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// ─── Open / Close ────────────────────────────────────────────────────

function open() {
  previousFocus = document.activeElement;

  // Make background inert
  document.querySelectorAll("body > *:not(#dialog-overlay)").forEach((el) => {
    el.setAttribute("inert", "");
  });

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  overlay.addEventListener("keydown", trapFocus);
}

function close() {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  overlay.removeEventListener("keydown", trapFocus);

  // Clean up any prompt input keydown listener
  if (inputKeyHandler) {
    inputEl.removeEventListener("keydown", inputKeyHandler);
    inputKeyHandler = null;
  }

  // Remove inert from background
  document.querySelectorAll("body > [inert]").forEach((el) => {
    el.removeAttribute("inert");
  });

  // Restore focus
  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus();
  }
  previousFocus = null;
  resolveFn = null;
}

// ─── Actions ─────────────────────────────────────────────────────────

function isPromptMode() {
  return !inputLabel.classList.contains("hidden");
}

function handleConfirm() {
  const value = isPromptMode() ? inputEl.value : true;
  if (resolveFn) {
    resolveFn(value);
  }
  close();
}

function handleCancel() {
  if (resolveFn) {
    resolveFn(isPromptMode() ? null : false);
  }
  close();
}

confirmBtn.addEventListener("click", handleConfirm);
cancelBtn.addEventListener("click", handleCancel);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    handleCancel();
  }
});
overlay.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    handleCancel();
  }
});

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Show a confirm dialog. Returns true/false.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirm(title, message) {
  titleEl.textContent = title;
  bodyEl.textContent = message;
  inputLabel.classList.add("hidden");
  confirmBtn.textContent = "Confirm";
  open();
  confirmBtn.focus();
  return new Promise((resolve) => {
    resolveFn = resolve;
  });
}

/**
 * Show a prompt dialog. Returns the entered string, or null if cancelled.
 * @param {string} title
 * @param {string} message
 * @param {string} [defaultValue]
 * @returns {Promise<string|null>}
 */
export function prompt(title, message, defaultValue = "") {
  titleEl.textContent = title;
  bodyEl.textContent = message;
  inputLabel.classList.remove("hidden");
  inputHint.textContent = title;
  inputEl.value = defaultValue;
  confirmBtn.textContent = "OK";
  open();
  inputEl.focus();
  inputEl.select();

  // Enter in the input confirms — one handler, cleaned up on close
  inputKeyHandler = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };
  inputEl.addEventListener("keydown", inputKeyHandler);

  return new Promise((resolve) => {
    resolveFn = resolve;
  });
}
