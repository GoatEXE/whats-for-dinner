const { normalizeName, normalizeTag } = require("../../lib/normalize");

function createCatalogRepo(db) {
  const getIngredientByNormalizedName = db.prepare(
    "SELECT id, name, normalized_name AS normalizedName FROM ingredients WHERE normalized_name = ?",
  );
  const insertIngredient = db.prepare(
    "INSERT INTO ingredients (name, normalized_name) VALUES (?, ?)",
  );
  const getIngredientById = db.prepare(
    "SELECT id, name, normalized_name AS normalizedName FROM ingredients WHERE id = ?",
  );
  const listIngredientsStatement = db.prepare(
    "SELECT id, name, normalized_name AS normalizedName FROM ingredients ORDER BY name COLLATE NOCASE",
  );
  const getTagByNormalizedName = db.prepare(
    "SELECT id, name, normalized_name AS normalizedName FROM tags WHERE normalized_name = ?",
  );
  const insertTag = db.prepare(
    "INSERT INTO tags (name, normalized_name) VALUES (?, ?)",
  );

  function ensureIngredients(items) {
    return items.map((item) => {
      const normalizedName = normalizeName(item.name);
      const existing = getIngredientByNormalizedName.get(normalizedName);

      if (existing) {
        return existing;
      }

      const result = insertIngredient.run(item.name.trim(), normalizedName);
      return {
        id: Number(result.lastInsertRowid),
        name: item.name.trim(),
        normalizedName,
      };
    });
  }

  function resolveIngredientsByIds(ids) {
    return ids.map((id) => getIngredientById.get(id)).filter(Boolean);
  }

  function resolveIngredientsByNames(names) {
    return names
      .map((name) => getIngredientByNormalizedName.get(normalizeName(name)))
      .filter(Boolean);
  }

  function ensureTags(tagNames) {
    return tagNames
      .map((tagName) => tagName.trim())
      .filter(Boolean)
      .map((tagName) => {
        const normalizedName = normalizeTag(tagName);
        const existing = getTagByNormalizedName.get(normalizedName);

        if (existing) {
          return existing;
        }

        const result = insertTag.run(tagName, normalizedName);
        return {
          id: Number(result.lastInsertRowid),
          name: tagName,
          normalizedName,
        };
      });
  }

  function listIngredients() {
    return listIngredientsStatement.all();
  }

  return {
    ensureIngredients,
    resolveIngredientsByIds,
    resolveIngredientsByNames,
    ensureTags,
    listIngredients,
  };
}

module.exports = {
  createCatalogRepo,
};
