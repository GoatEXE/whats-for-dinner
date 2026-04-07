const { HttpError } = require("../../lib/errors");

function createHistoryService(historyRepo, mealsRepo) {
  function listHistory(limit) {
    return historyRepo.listHistory(limit);
  }

  function addHistory(entry) {
    if (!mealsRepo.exists(entry.mealId)) {
      throw new HttpError(404, "Meal not found");
    }

    const record = historyRepo.addHistory({
      ...entry,
      servedOn: entry.servedOn ?? new Date().toISOString().slice(0, 10),
    });

    return {
      ...record,
      isFavorite: Boolean(record.isFavorite),
    };
  }

  return {
    listHistory,
    addHistory,
  };
}

module.exports = {
  createHistoryService,
};
