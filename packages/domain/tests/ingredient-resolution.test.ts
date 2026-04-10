import { HttpError } from "../src/errors";
import { resolveAvailableIngredients } from "../src/ingredient-resolution";

describe("resolveAvailableIngredients", () => {
  it("deduplicates pantry, id, and name resolutions while preserving first-seen order by default", () => {
    const result = resolveAvailableIngredients(
      {
        useSavedPantry: true,
        ingredientIds: [1, 2],
        ingredientNames: ["Salt", "Beans"],
      },
      {
        resolveIngredientsByIds: (ingredientIds) =>
          ingredientIds.map((id) => ({
            id,
            name: id === 1 ? "Rice" : "Beans",
          })),
        pantryLookup: () => [{ ingredientId: 2, name: "Beans" }],
        resolveIngredientNames: () => [
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
        resolveIngredientsByIds: () => [],
        pantryLookup: () => [{ ingredientId: 2, name: "Rice" }],
        resolveIngredientNames: () => [{ id: 1, name: "Beans" }],
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
          resolveIngredientsByIds: () => [{ id: 1, name: "Rice" }],
          pantryLookup: () => [],
          resolveIngredientNames: () => [],
        },
      ),
    ).toThrow(HttpError);

    try {
      resolveAvailableIngredients(
        {
          ingredientIds: [1, 2],
        },
        {
          resolveIngredientsByIds: () => [{ id: 1, name: "Rice" }],
          pantryLookup: () => [],
          resolveIngredientNames: () => [],
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(404);
      expect((error as HttpError).message).toContain("ingredient IDs were not found");
    }
  });
});
