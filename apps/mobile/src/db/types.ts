/**
 * Minimal synchronous SQLite surface that both the native `expo-sqlite`
 * adapter and the web `sql.js` wrapper implement. Keeping this as a
 * structural interface (rather than aliasing `SQLiteDatabase` directly)
 * is what lets the mobile app swap its backing store per-platform.
 */
export interface DatabaseHandle {
  getFirstSync<T = unknown>(sql: string, ...params: unknown[]): T | null;
  getAllSync<T = unknown>(sql: string, ...params: unknown[]): T[];
  runSync(sql: string, ...params: unknown[]): { changes: number };
  execSync(sql: string): void;
  withTransactionSync<T>(callback: () => T): T;
}

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

export interface WeeklyPlanRecord {
  id: string;
  weekStart: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WeeklyPlanSlotRecord {
  planId: string;
  day: number;
  mealId: string | null;
  mealName: string | null;
  customName: string | null;
  notes: string | null;
  servedAt: string | null;
}

export interface WeeklyPlanWithSlots extends WeeklyPlanRecord {
  slots: WeeklyPlanSlotRecord[];
}
