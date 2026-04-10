import type { AvailableIngredient } from "./ingredient-resolution";

export interface SuggestionIngredient {
  ingredientId: number;
  name: string;
  quantityText?: string | null;
  isOptional?: boolean;
}

export interface SuggestionMeal {
  id: number;
  name: string;
  notes?: string | null;
  prepMinutes?: number | null;
  isFavorite: boolean;
  tags: string[];
  ingredients: SuggestionIngredient[];
}

export interface SuggestionMatch {
  id: number;
  name: string;
  notes?: string | null;
  prepMinutes?: number | null;
  isFavorite: boolean;
  tags: string[];
  requiredIngredientCount: number;
  matchedRequiredCount: number;
  missingRequiredIngredients: SuggestionIngredient[];
  matchedOptionalIngredients: SuggestionIngredient[];
  missingOptionalIngredients: SuggestionIngredient[];
  isFullMatch: boolean;
  matchPercentage: number;
  shoppingNeededCount: number;
}

export interface FindMatchesInput {
  meals: SuggestionMeal[];
  availableIngredients: AvailableIngredient[];
  favoritesOnly?: boolean;
  includePartial?: boolean;
}

export function sortMatches(a: SuggestionMatch, b: SuggestionMatch) {
  if (a.isFullMatch !== b.isFullMatch) {
    return a.isFullMatch ? -1 : 1;
  }

  if (a.matchPercentage !== b.matchPercentage) {
    return b.matchPercentage - a.matchPercentage;
  }

  if (
    a.missingRequiredIngredients.length !== b.missingRequiredIngredients.length
  ) {
    return (
      a.missingRequiredIngredients.length - b.missingRequiredIngredients.length
    );
  }

  if (a.isFavorite !== b.isFavorite) {
    return a.isFavorite ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

export function buildMatch(
  meal: SuggestionMeal,
  availableMap: Map<number, AvailableIngredient>,
): SuggestionMatch {
  const requiredIngredients = meal.ingredients.filter(
    (ingredient) => !ingredient.isOptional,
  );
  const optionalIngredients = meal.ingredients.filter(
    (ingredient) => ingredient.isOptional,
  );
  const matchedRequiredIngredients = requiredIngredients.filter((ingredient) =>
    availableMap.has(ingredient.ingredientId),
  );
  const missingRequiredIngredients = requiredIngredients.filter(
    (ingredient) => !availableMap.has(ingredient.ingredientId),
  );
  const matchedOptionalIngredients = optionalIngredients.filter((ingredient) =>
    availableMap.has(ingredient.ingredientId),
  );
  const missingOptionalIngredients = optionalIngredients.filter(
    (ingredient) => !availableMap.has(ingredient.ingredientId),
  );
  const matchPercentage =
    requiredIngredients.length === 0
      ? 1
      : matchedRequiredIngredients.length / requiredIngredients.length;

  return {
    id: meal.id,
    name: meal.name,
    notes: meal.notes,
    prepMinutes: meal.prepMinutes,
    isFavorite: meal.isFavorite,
    tags: meal.tags,
    requiredIngredientCount: requiredIngredients.length,
    matchedRequiredCount: matchedRequiredIngredients.length,
    missingRequiredIngredients,
    matchedOptionalIngredients,
    missingOptionalIngredients,
    isFullMatch: missingRequiredIngredients.length === 0,
    matchPercentage,
    shoppingNeededCount: missingRequiredIngredients.length,
  };
}

export function findMatches(input: FindMatchesInput) {
  const availableMap = new Map(
    input.availableIngredients.map((ingredient) => [
      ingredient.ingredientId,
      ingredient,
    ]),
  );
  const matches = input.meals
    .filter((meal) => !input.favoritesOnly || meal.isFavorite)
    .map((meal) => buildMatch(meal, availableMap))
    .filter((match) => (input.includePartial ?? true) || match.isFullMatch)
    .sort(sortMatches);

  return {
    availableIngredients: input.availableIngredients,
    matches,
  };
}
