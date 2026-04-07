function normalizeName(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTag(value) {
  return normalizeName(value)
    .replace(/[^a-z0-9 -]/g, "")
    .trim();
}

module.exports = {
  normalizeName,
  normalizeTag,
};
