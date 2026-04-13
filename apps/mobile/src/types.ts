/**
 * UI-layer types used across screens and feature hooks.
 * These are the "view model" types returned by the hooks after DB record mapping.
 * For DB-layer record types, import directly from './db/types'.
 */

export interface Ingredient {
  id: string;
  name: string;
  quantityText: string | null;
  isOptional: boolean;
}

export interface Meal {
  id: string;
  name: string;
  notes: string | null;
  prepMinutes: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  sourceUrl: string | null;
  sourceHost: string | null;
  tags: string[];
  ingredients: Ingredient[];
  createdAt: string;
  updatedAt: string;
}

export interface PantryEntry {
  ingredientId: string;
  name: string;
  quantityText: string | null;
}

export interface HistoryEntry {
  id: string;
  mealId: string;
  mealName: string;
  servedOn: string;
}

export interface WeeklyPlanSlot {
  day: number;
  mealId: string | null;
  mealName: string | null;
  notes: string | null;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  slots: WeeklyPlanSlot[];
}

// Re-export DB types for cases where direct DB interaction is needed
export type {
  MealRecord,
  MealWriteInput,
  MealUpdateInput,
  MealIngredientRecord,
  MealIngredientInput,
  MealListFilters,
  PantryItemRecord,
  PantryItemInput,
  HistoryRecord,
  HistoryWriteInput,
} from './db/types';
