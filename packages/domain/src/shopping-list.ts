import type { AvailableIngredient } from "./ingredient-resolution";

export interface ShoppingListIngredient {
  ingredientId: number;
  name: string;
  quantityText?: string | null;
  isOptional?: boolean;
}

export interface ShoppingListMeal {
  id: number;
  name: string;
  ingredients: ShoppingListIngredient[];
}

export interface IngredientReference {
  mealId: number;
  mealName: string;
  quantityText: string | null;
  isOptional: boolean;
}

export interface AggregatedIngredient {
  ingredientId: number;
  name: string;
  requiredReferences: IngredientReference[];
  optionalReferences: IngredientReference[];
}

export interface GroupedIngredientOutput {
  ingredientId: number;
  name: string;
  mealNames: string[];
  quantityHints: string[];
}

export interface ShoppingListResult {
  selectedMeals: Array<{ id: number; name: string }>;
  availableIngredients: AvailableIngredient[];
  summary: {
    selectedMealCount: number;
    requiredToBuyCount: number;
    requiredOnHandCount: number;
    optionalToBuyCount: number;
  };
  requiredToBuy: GroupedIngredientOutput[];
  requiredOnHand: GroupedIngredientOutput[];
  optionalToBuy: GroupedIngredientOutput[];
  copyText: string;
}

function dedupeValues(values: string[]) {
  return [...new Set(values)];
}

export function dedupeMealIds(mealIds: number[]) {
  const seen = new Set<number>();

  return mealIds.filter((mealId) => {
    if (seen.has(mealId)) {
      return false;
    }

    seen.add(mealId);
    return true;
  });
}

export function createIngredientReference(
  meal: ShoppingListMeal,
  ingredient: ShoppingListIngredient,
): IngredientReference {
  return {
    mealId: meal.id,
    mealName: meal.name,
    quantityText: ingredient.quantityText ?? null,
    isOptional: Boolean(ingredient.isOptional),
  };
}

export function buildMealSummary(meal: ShoppingListMeal) {
  return {
    id: meal.id,
    name: meal.name,
  };
}

export function formatQuantityHint(reference: IngredientReference) {
  if (reference.quantityText) {
    return `${reference.mealName} — ${reference.quantityText}`;
  }

  return reference.mealName;
}

export function buildGroupedIngredientOutput(
  item: AggregatedIngredient,
): GroupedIngredientOutput {
  const allReferences = [
    ...item.requiredReferences,
    ...item.optionalReferences,
  ];

  return {
    ingredientId: item.ingredientId,
    name: item.name,
    mealNames: dedupeValues(allReferences.map((reference) => reference.mealName)),
    quantityHints: allReferences.map(formatQuantityHint),
  };
}

export function aggregateIngredientsByMeal(meals: ShoppingListMeal[]) {
  const ingredientMap = new Map<number, AggregatedIngredient>();

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

export function formatShoppingListPlainText(
  result: Omit<ShoppingListResult, "copyText">,
) {
  const selectedMealNames = result.selectedMeals.map((meal) => meal.name).join(", ");
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

export function buildShoppingList(input: {
  meals: ShoppingListMeal[];
  availableIngredients: AvailableIngredient[];
  includeOptional: boolean;
}): ShoppingListResult {
  const availableIngredientMap = new Map(
    input.availableIngredients.map((ingredient) => [
      ingredient.ingredientId,
      ingredient,
    ]),
  );
  const groupedIngredients = aggregateIngredientsByMeal(input.meals);
  const requiredToBuy: GroupedIngredientOutput[] = [];
  const requiredOnHand: GroupedIngredientOutput[] = [];
  const optionalToBuy: GroupedIngredientOutput[] = [];

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

    if (input.includeOptional && !available) {
      optionalToBuy.push(groupedOutput);
    }
  });

  const result = {
    selectedMeals: input.meals.map(buildMealSummary),
    availableIngredients: input.availableIngredients,
    summary: {
      selectedMealCount: input.meals.length,
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
