export function normalizeName(value: unknown) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeTag(value: unknown) {
  return normalizeName(value)
    .replace(/[^a-z0-9 -]/g, "")
    .trim();
}
