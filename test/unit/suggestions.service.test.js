/* global vi */

const {
  createSuggestionsService,
  sortMatches,
} = require("../../src/modules/suggestions/suggestions.service");

describe("sortMatches", () => {
  it("orders matches by fullness, percentage, missing ingredients, favorite, then name", () => {
    const matches = [
      {
        name: "Beta",
        isFullMatch: false,
        matchPercentage: 0.5,
        missingRequiredIngredients: [{ name: "Rice" }],
        isFavorite: true,
      },
      {
        name: "Alpha",
        isFullMatch: true,
        matchPercentage: 1,
        missingRequiredIngredients: [],
        isFavorite: false,
      },
      {
        name: "Gamma",
        isFullMatch: true,
        matchPercentage: 1,
        missingRequiredIngredients: [],
        isFavorite: true,
      },
    ];

    matches.sort(sortMatches);

    expect(matches.map((match) => match.name)).toEqual([
      "Gamma",
      "Alpha",
      "Beta",
    ]);
  });
});

describe("pickRandomMeal", () => {
  it("excludes explicitly blocked meal ids before selecting a candidate", () => {
    const suggestionsService = createSuggestionsService(
      {
        listSavedPantryItems: () => [],
        listRecentlyServedMealIds: () => [],
        listCandidateMeals: () => [
          {
            id: 1,
            name: "A",
            ingredients: [],
            isFavorite: false,
            tags: [],
          },
          {
            id: 2,
            name: "B",
            ingredients: [],
            isFavorite: false,
            tags: [],
          },
        ],
      },
      {
        resolveIngredientsByIds: () => [],
        ensureIngredients: () => [],
      },
    );

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      const result = suggestionsService.pickRandomMeal({
        favoritesOnly: false,
        fullMatchOnly: false,
        excludeServedWithinDays: 0,
        excludeMealIds: [1],
      });

      expect(result.meal.id).toBe(2);
      expect(result.candidateCount).toBe(1);
      expect(result.filtersApplied.excludeMealIds).toEqual([1]);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
