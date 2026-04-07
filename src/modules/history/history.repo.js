function createHistoryRepo(db) {
  const listHistoryStatement = db.prepare(
    `SELECT h.id, h.meal_id AS mealId, h.served_on AS servedOn, h.source, h.created_at AS createdAt,
            m.name AS mealName, m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     ORDER BY h.served_on DESC, h.created_at DESC
     LIMIT ?`,
  );
  const insertHistoryStatement = db.prepare(
    "INSERT INTO meal_history (meal_id, served_on, source) VALUES (?, ?, ?)",
  );
  const getHistoryByIdStatement = db.prepare(
    `SELECT h.id, h.meal_id AS mealId, h.served_on AS servedOn, h.source, h.created_at AS createdAt,
            m.name AS mealName, m.is_favorite AS isFavorite
     FROM meal_history h
     INNER JOIN meals m ON m.id = h.meal_id
     WHERE h.id = ?`,
  );
  const recentServedMealIdsStatement = db.prepare(
    `SELECT DISTINCT meal_id AS mealId
     FROM meal_history
     WHERE served_on >= date('now', ?)
     ORDER BY served_on DESC`,
  );

  function listHistory(limit) {
    return listHistoryStatement.all(limit).map((row) => ({
      ...row,
      isFavorite: Boolean(row.isFavorite),
    }));
  }

  function addHistory(entry) {
    const result = insertHistoryStatement.run(
      entry.mealId,
      entry.servedOn,
      entry.source,
    );
    const row = getHistoryByIdStatement.get(Number(result.lastInsertRowid));

    return {
      ...row,
      isFavorite: Boolean(row.isFavorite),
    };
  }

  function listRecentlyServedMealIds(days) {
    if (days <= 0) {
      return [];
    }

    return recentServedMealIdsStatement
      .all(`-${days} day`)
      .map((row) => row.mealId);
  }

  return {
    listHistory,
    addHistory,
    listRecentlyServedMealIds,
  };
}

module.exports = {
  createHistoryRepo,
};
