const { HttpError } = require("../../src/lib/errors");
const {
  resolveAvailableIngredients,
} = require("../../src/lib/ingredient-resolution");

describe("resolveAvailableIngredients", () => {
  it("deduplicates pantry, id, and name resolutions while preserving first-seen order by default", () => {
    const result = resolveAvailableIngredients(
      {
        useSavedPantry: true,
        ingredientIds: [1, 2],
        ingredientNames: ["Salt", "Beans"],
      },
      {
        catalogRepo: {
          resolveIngredientsByIds: (ingredientIds) =>
            ingredientIds.map((id) => ({
              id,
              name: id === 1 ? "Rice" : "Beans",
            })),
        },
        pantryLookup: () => [{ ingredientId: 2, name: "Beans" }],
        nameResolver: () => [
          { id: 3, name: "Salt" },
          { id: 2, name: "Beans" },
        ],
      },
    );

    expect(result).toEqual([
      { ingredientId: 2, name: "Beans" },
      { ingredientId: 1, name: "Rice" },
      { ingredientId: 3, name: "Salt" },
    ]);
  });

  it("applies an optional sort comparator after deduping", () => {
    const result = resolveAvailableIngredients(
      {
        useSavedPantry: true,
        ingredientNames: ["Beans"],
      },
      {
        catalogRepo: {
          resolveIngredientsByIds: () => [],
        },
        pantryLookup: () => [{ ingredientId: 2, name: "Rice" }],
        nameResolver: () => [{ id: 1, name: "Beans" }],
        sortComparator: (left, right) => left.name.localeCompare(right.name),
      },
    );

    expect(result).toEqual([
      { ingredientId: 1, name: "Beans" },
      { ingredientId: 2, name: "Rice" },
    ]);
  });

  it("throws a 404 when any ingredient id cannot be resolved", () => {
    expect(() =>
      resolveAvailableIngredients(
        {
          ingredientIds: [1, 2],
        },
        {
          catalogRepo: {
            resolveIngredientsByIds: () => [{ id: 1, name: "Rice" }],
          },
          pantryLookup: () => [],
          nameResolver: () => [],
        },
      ),
    ).toThrow(HttpError);

    try {
      resolveAvailableIngredients(
        {
          ingredientIds: [1, 2],
        },
        {
          catalogRepo: {
            resolveIngredientsByIds: () => [{ id: 1, name: "Rice" }],
          },
          pantryLookup: () => [],
          nameResolver: () => [],
        },
      );
    } catch (error) {
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("ingredient IDs were not found");
    }
  });
});
