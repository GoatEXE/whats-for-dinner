const {
  aggregateIngredientsByMeal,
  buildShoppingList,
  dedupeMealIds,
} = require("../../src/modules/shopping-list/shopping-list.service");

describe("shopping list generation", () => {
  it("deduplicates meal ids while preserving order", () => {
    expect(dedupeMealIds([3, 2, 3, 1, 2])).toEqual([3, 2, 1]);
  });

  it("aggregates shared ingredients and separates required vs optional shopping items", () => {
    const meals = [
      {
        id: 1,
        name: "Rice Bowls",
        ingredients: [
          {
            ingredientId: 10,
            name: "Rice",
            quantityText: "2 cups cooked",
            isOptional: false,
          },
          {
            ingredientId: 11,
            name: "Chicken",
            quantityText: "1 lb",
            isOptional: false,
          },
        ],
      },
      {
        id: 2,
        name: "Bean Burritos",
        ingredients: [
          {
            ingredientId: 10,
            name: "Rice",
            quantityText: "1 cup cooked",
            isOptional: false,
          },
          {
            ingredientId: 12,
            name: "Beans",
            quantityText: "1 can",
            isOptional: false,
          },
          {
            ingredientId: 13,
            name: "Cilantro",
            quantityText: "1 bunch",
            isOptional: true,
          },
        ],
      },
    ];

    const aggregated = aggregateIngredientsByMeal(meals);
    expect(aggregated).toHaveLength(4);
    expect(
      aggregated.find((item) => item.name === "Rice").requiredReferences,
    ).toHaveLength(2);

    const result = buildShoppingList({
      meals,
      availableIngredients: [{ ingredientId: 10, name: "Rice" }],
      includeOptional: true,
    });

    expect(result.selectedMeals).toEqual([
      { id: 1, name: "Rice Bowls" },
      { id: 2, name: "Bean Burritos" },
    ]);
    expect(result.availableIngredients).toEqual([
      { ingredientId: 10, name: "Rice" },
    ]);
    expect(result.requiredOnHand.map((item) => item.name)).toEqual(["Rice"]);
    expect(result.requiredOnHand[0].quantityHints).toEqual([
      "Rice Bowls — 2 cups cooked",
      "Bean Burritos — 1 cup cooked",
    ]);
    expect(result.requiredToBuy.map((item) => item.name)).toEqual([
      "Beans",
      "Chicken",
    ]);
    expect(result.optionalToBuy.map((item) => item.name)).toEqual(["Cilantro"]);
    expect(result.summary).toEqual({
      selectedMealCount: 2,
      requiredToBuyCount: 2,
      requiredOnHandCount: 1,
      optionalToBuyCount: 1,
    });
    expect(result.copyText).toContain(
      "Shopping list for: Rice Bowls, Bean Burritos",
    );
    expect(result.copyText).toContain("- Chicken — Rice Bowls — 1 lb");
    expect(result.copyText).toContain("Optional:");
  });

  it("excludes optional-only ingredients when includeOptional is false", () => {
    const result = buildShoppingList({
      meals: [
        {
          id: 1,
          name: "Soup",
          ingredients: [
            {
              ingredientId: 20,
              name: "Croutons",
              quantityText: "for serving",
              isOptional: true,
            },
          ],
        },
      ],
      availableIngredients: [],
      includeOptional: false,
    });

    expect(result.optionalToBuy).toEqual([]);
    expect(result.copyText).not.toContain("Optional:");
  });
});
