import type { SQLiteDatabase } from "expo-sqlite";

export type DatabaseHandle = SQLiteDatabase;

export interface IngredientRecord {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TagRecord {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MealIngredientInput {
  name: string;
  quantityText?: string | null;
  isOptional?: boolean;
}

export interface MealIngredientRecord {
  ingredientId: string;
  name: string;
  normalizedName: string;
  quantityText: string | null;
  isOptional: boolean;
  sortOrder: number;
}

export interface MealRecord {
  id: string;
  name: string;
  normalizedName: string;
  notes: string | null;
  prepMinutes: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  sourceUrl: string | null;
  sourceHost: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ingredients: MealIngredientRecord[];
  tags: string[];
}

export interface MealListFilters {
  archived?: boolean;
  favorite?: boolean;
  q?: string;
  tag?: string;
  includeDeleted?: boolean;
}

export interface MealWriteInput {
  id?: string;
  name: string;
  notes?: string | null;
  prepMinutes?: number | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  sourceUrl?: string | null;
  sourceHost?: string | null;
  imageUrl?: string | null;
  ingredients: MealIngredientInput[];
  tags?: string[];
}

export interface MealUpdateInput
  extends Partial<Omit<MealWriteInput, "id" | "ingredients">> {
  ingredients?: MealIngredientInput[];
}

export interface PantryItemInput {
  ingredientId?: string;
  name?: string;
}

export interface PantryItemRecord {
  ingredientId: string;
  name: string;
  normalizedName: string;
  addedAt: string;
}

export interface HistoryWriteInput {
  id?: string;
  mealId: string;
  servedOn?: string;
}

export interface HistoryRecord {
  id: string;
  mealId: string;
  mealName: string;
  servedOn: string;
  createdAt: string;
  isFavorite: boolean;
}
