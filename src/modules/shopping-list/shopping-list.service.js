const { HttpError } = require("../../lib/errors");

function dedupeValues(values) {
  return [...new Set(values)];
}

function dedupeMealIds(mealIds) {
  const seen = new Set();

  return mealIds.filter((mealId) => {
    if (seen.has(mealId)) {
      return false;
    }

    seen.add(mealId);
    return true;
  });
}

function createIngredientReference(meal, ingredient) {
  return {
    mealId: meal.id,
    mealName: meal.name,
    quantityText: ingredient.quantityText ?? null,
    isOptional: Boolean(ingredient.isOptional),
  };
}

function buildMealSummary(meal) {
  return {
    id: meal.id,
    name: meal.name,
  };
}

function formatQuantityHint(reference) {
  if (reference.quantityText) {
    return `${reference.mealName} — ${reference.quantityText}`;
  }

  return reference.mealName;
}

function buildGroupedIngredientOutput(item) {
  const allReferences = [
    ...item.requiredReferences,
    ...item.optionalReferences,
  ];

  return {
    ingredientId: item.ingredientId,
    name: item.name,
    mealNames: dedupeValues(
      allReferences.map((reference) => reference.mealName),
    ),
    quantityHints: allReferences.map(formatQuantityHint),
  };
}

function aggregateIngredientsByMeal(meals) {
  const ingredientMap = new Map();

  meals.forEach((meal) => {
    meal.ingredients.forEach((ingredient) => {
      const existing = ingredientMap.get(ingredient.ingredientId) ?? {
        ingredientId: ingredient.ingredientId,
        name: ingredient.name,
        requiredReferences: [],
        optionalReferences: [],
      };
      const reference = createIngredientReference(meal, ingredient);

      if (ingredient.isOptional) {
        existing.optionalReferences.push(reference);
      } else {
        existing.requiredReferences.push(reference);
      }

      ingredientMap.set(ingredient.ingredientId, existing);
    });
  });

  return [...ingredientMap.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function formatShoppingListPlainText(result) {
  const selectedMealNames = result.selectedMeals
    .map((meal) => meal.name)
    .join(", ");
  const lines = [`Shopping list for: ${selectedMealNames}`, "", "Need to buy:"];

  if (result.requiredToBuy.length === 0) {
    lines.push("- None");
  } else {
    result.requiredToBuy.forEach((item) => {
      lines.push(`- ${item.name} — ${item.quantityHints.join("; ")}`);
    });
  }

  if (result.optionalToBuy.length > 0) {
    lines.push("");
    lines.push("Optional:");
    result.optionalToBuy.forEach((item) => {
      lines.push(`- ${item.name} — ${item.quantityHints.join("; ")}`);
    });
  }

  return lines.join("\n");
}

function buildShoppingList({ meals, availableIngredients, includeOptional }) {
  const availableIngredientMap = new Map(
    availableIngredients.map((ingredient) => [
      ingredient.ingredientId,
      ingredient,
    ]),
  );
  const groupedIngredients = aggregateIngredientsByMeal(meals);
  const requiredToBuy = [];
  const requiredOnHand = [];
  const optionalToBuy = [];

  groupedIngredients.forEach((item) => {
    const available = availableIngredientMap.has(item.ingredientId);
    const groupedOutput = buildGroupedIngredientOutput(item);

    if (item.requiredReferences.length > 0) {
      if (available) {
        requiredOnHand.push(groupedOutput);
      } else {
        requiredToBuy.push(groupedOutput);
      }

      return;
    }

    if (includeOptional && !available) {
      optionalToBuy.push(groupedOutput);
    }
  });

  const result = {
    selectedMeals: meals.map(buildMealSummary),
    availableIngredients,
    summary: {
      selectedMealCount: meals.length,
      requiredToBuyCount: requiredToBuy.length,
      requiredOnHandCount: requiredOnHand.length,
      optionalToBuyCount: optionalToBuy.length,
    },
    requiredToBuy,
    requiredOnHand,
    optionalToBuy,
  };

  return {
    ...result,
    copyText: formatShoppingListPlainText(result),
  };
}

function createShoppingListService(shoppingListRepo, catalogRepo) {
  function resolveAvailableIngredients(input) {
    const availableIngredients = [];

    if (input.useSavedPantry) {
      availableIngredients.push(
        ...shoppingListRepo.listPantryItems().map((item) => ({
          ingredientId: item.ingredientId,
          name: item.name,
        })),
      );
    }

    if (input.ingredientIds && input.ingredientIds.length > 0) {
      const resolved = catalogRepo.resolveIngredientsByIds(input.ingredientIds);

      if (resolved.length !== input.ingredientIds.length) {
        throw new HttpError(404, "One or more ingredient IDs were not found");
      }

      availableIngredients.push(
        ...resolved.map((ingredient) => ({
          ingredientId: ingredient.id,
          name: ingredient.name,
        })),
      );
    }

    if (input.ingredientNames && input.ingredientNames.length > 0) {
      const resolved = catalogRepo.resolveIngredientsByNames(
        input.ingredientNames,
      );

      availableIngredients.push(
        ...resolved.map((ingredient) => ({
          ingredientId: ingredient.id,
          name: ingredient.name,
        })),
      );
    }

    const dedupedMap = new Map();
    availableIngredients.forEach((ingredient) => {
      dedupedMap.set(ingredient.ingredientId, ingredient);
    });

    return [...dedupedMap.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  function generate(input) {
    const mealIds = dedupeMealIds(input.mealIds);
    const meals = shoppingListRepo.getSelectedMeals(mealIds);

    if (meals.length !== mealIds.length) {
      throw new HttpError(404, "One or more selected meals were not found");
    }

    return buildShoppingList({
      meals,
      availableIngredients: resolveAvailableIngredients(input),
      includeOptional: input.includeOptional,
    });
  }

  return {
    generate,
  };
}

module.exports = {
  createShoppingListService,
  buildShoppingList,
  formatShoppingListPlainText,
  aggregateIngredientsByMeal,
  dedupeMealIds,
};
