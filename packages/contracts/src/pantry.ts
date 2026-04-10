import { z } from "zod";

import { stringOrNull } from "./meals";

export const pantryItemSchema = z
  .object({
    ingredientId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    quantityText: stringOrNull.optional(),
  })
  .refine(
    (value) => value.ingredientId || value.name,
    "ingredientId or name is required",
  );

export const pantryReplaceSchema = z.object({
  items: z.array(pantryItemSchema),
});

export const pantryDeleteParamSchema = z.object({
  ingredientId: z.coerce.number().int().positive(),
});

export type PantryItem = z.infer<typeof pantryItemSchema>;
export type PantryReplace = z.infer<typeof pantryReplaceSchema>;
export type PantryDeleteParam = z.infer<typeof pantryDeleteParamSchema>;
