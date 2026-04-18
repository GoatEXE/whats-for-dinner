import { HttpError } from "./errors";

export interface IngredientLookupItem {
  ingredientId?: number | null;
  id?: number | null;
  name: string;
}

export interface AvailableIngredient {
  ingredientId: number;
  name: string;
}

export interface ResolveAvailableIngredientsInput {
  useSavedPantry?: boolean;
  ingredientIds?: number[];
  ingredientNames?: string[];
}

export interface ResolveAvailableIngredientsOptions {
  pantryLookup: () => IngredientLookupItem[];
  resolveIngredientsByIds: (ingredientIds: number[]) => IngredientLookupItem[];
  resolveIngredientNames: (ingredientNames: string[]) => IngredientLookupItem[];
  sortComparator?: (left: AvailableIngredient, right: AvailableIngredient) => number;
}

export function toAvailableIngredient(item: IngredientLookupItem): AvailableIngredient {
  return {
    ingredientId: (item.ingredientId ?? item.id) as number,
    name: item.name,
  };
}

export function resolveAvailableIngredients(
  input: ResolveAvailableIngredientsInput,
  options: ResolveAvailableIngredientsOptions,
) {
  const availableIngredients: AvailableIngredient[] = [];

  if (input.useSavedPantry) {
    availableIngredients.push(
      ...options.pantryLookup().map(toAvailableIngredient),
    );
  }

  if (input.ingredientIds && input.ingredientIds.length > 0) {
    const resolved = options.resolveIngredientsByIds(input.ingredientIds);

    if (resolved.length !== input.ingredientIds.length) {
      throw new HttpError(404, "One or more ingredient IDs were not found");
    }

    availableIngredients.push(...resolved.map(toAvailableIngredient));
  }

  if (input.ingredientNames && input.ingredientNames.length > 0) {
    const resolved = options.resolveIngredientNames(input.ingredientNames);
    availableIngredients.push(...resolved.map(toAvailableIngredient));
  }

  const dedupedIngredients = new Map<number, AvailableIngredient>();

  availableIngredients.forEach((ingredient) => {
    dedupedIngredients.set(ingredient.ingredientId, ingredient);
  });

  const resolvedIngredients = [...dedupedIngredients.values()];

  if (options.sortComparator) {
    resolvedIngredients.sort(options.sortComparator);
  }

  return resolvedIngredients;
}
