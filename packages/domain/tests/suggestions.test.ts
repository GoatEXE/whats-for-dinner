import { vi } from "vitest";

import { pickRandomMeal } from "../src/random-picker";
import { buildMatch, findMatches, sortMatches } from "../src/suggestions";

describe("sortMatches", () => {
  it("orders matches by fullness, percentage, missing ingredients, favorite, then name", () => {
    const matches = [
      {
        name: "Beta",
        isFullMatch: false,
        matchPercentage: 0.5,
        missingRequiredIngredients: [{ name: "Rice", ingredientId: 1 }],
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
    ] as Parameters<typeof sortMatches>[0][];

    matches.sort(sortMatches);

    expect(matches.map((match) => match.name)).toEqual([
      "Gamma",
      "Alpha",
      "Beta",
    ]);
  });
});

describe("buildMatch", () => {
  it("splits required and optional ingredients and calculates match percentages", () => {
    const match = buildMatch(
      {
        id: 1,
        name: "Rice Bowls",
        notes: null,
        prepMinutes: 25,
        isFavorite: true,
        tags: ["quick"],
        ingredients: [
          { ingredientId: 10, name: "Rice", isOptional: false },
          { ingredientId: 11, name: "Chicken", isOptional: false },
          { ingredientId: 12, name: "Cilantro", isOptional: true },
        ],
      },
      new Map([
        [10, { ingredientId: 10, name: "Rice" }],
        [12, { ingredientId: 12, name: "Cilantro" }],
      ]),
    );

    expect(match).toMatchObject({
      requiredIngredientCount: 2,
      matchedRequiredCount: 1,
      isFullMatch: false,
      matchPercentage: 0.5,
      shoppingNeededCount: 1,
    });
    expect(match.missingRequiredIngredients.map((ingredient) => ingredient.name)).toEqual([
      "Chicken",
    ]);
    expect(match.matchedOptionalIngredients.map((ingredient) => ingredient.name)).toEqual([
      "Cilantro",
    ]);
  });
});

describe("findMatches", () => {
  it("filters to full matches when partial matches are excluded", () => {
    const result = findMatches({
      meals: [
        {
          id: 1,
          name: "Full Match",
          notes: null,
          prepMinutes: null,
          isFavorite: false,
          tags: [],
          ingredients: [{ ingredientId: 10, name: "Rice", isOptional: false }],
        },
        {
          id: 2,
          name: "Partial Match",
          notes: null,
          prepMinutes: null,
          isFavorite: false,
          tags: [],
          ingredients: [
            { ingredientId: 10, name: "Rice", isOptional: false },
            { ingredientId: 11, name: "Beans", isOptional: false },
          ],
        },
      ],
      availableIngredients: [{ ingredientId: 10, name: "Rice" }],
      includePartial: false,
    });

    expect(result.matches.map((match) => match.name)).toEqual(["Full Match"]);
  });
});

describe("pickRandomMeal", () => {
  it("excludes explicitly blocked meal ids before selecting a candidate", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      const result = pickRandomMeal({
        meals: [
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
        recentMealIds: [],
        availableIngredients: [],
        filters: {
          favoritesOnly: false,
          fullMatchOnly: false,
          excludeServedWithinDays: 0,
          excludeMealIds: [1],
        },
      });

      expect(result.meal.id).toBe(2);
      expect(result.candidateCount).toBe(1);
      expect(result.filtersApplied.excludeMealIds).toEqual([1]);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
