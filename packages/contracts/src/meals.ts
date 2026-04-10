import { z } from "zod";

import { recipeEnvelopeSchema } from "./envelope";
import { booleanish } from "./validation";

export const stringOrNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const nullableInteger = z.preprocess(
  (value) => {
    if (value === "" || value == null) {
      return null;
    }

    return value;
  },
  z.coerce.number().int().min(0).max(1440).nullable(),
);

export const ingredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantityText: stringOrNull.optional(),
  isOptional: booleanish().optional().default(false),
});

export const mealWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: stringOrNull.optional(),
  prepMinutes: nullableInteger.optional(),
  isFavorite: booleanish().optional().default(false),
  ingredients: z.array(ingredientInputSchema).min(1),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional().default([]),
});

export const mealPatchSchema = mealWriteSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

export const mealIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const mealListQuerySchema = z.object({
  favorite: booleanish().optional(),
  archived: booleanish().optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

export const importBodySchema = recipeEnvelopeSchema;

export const favoriteBodySchema = z.object({
  isFavorite: booleanish().optional(),
});

export type IngredientInput = z.infer<typeof ingredientInputSchema>;
export type MealWrite = z.infer<typeof mealWriteSchema>;
export type MealPatch = z.infer<typeof mealPatchSchema>;
export type MealIdParam = z.infer<typeof mealIdParamSchema>;
export type MealListQuery = z.infer<typeof mealListQuerySchema>;
export type ImportBody = z.infer<typeof importBodySchema>;
export type FavoriteBody = z.infer<typeof favoriteBodySchema>;
