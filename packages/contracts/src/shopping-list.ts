import { z } from "zod";

import { booleanish } from "./validation";

export const shoppingListGenerateSchema = z.object({
  mealIds: z.array(z.coerce.number().int().positive()).min(1).max(25),
  useSavedPantry: booleanish({ strict: true }).optional().default(true),
  ingredientIds: z.array(z.coerce.number().int().positive()).optional(),
  ingredientNames: z.array(z.string().trim().min(1).max(120)).optional(),
  includeOptional: booleanish({ strict: true }).optional().default(false),
});

export type ShoppingListGenerate = z.infer<typeof shoppingListGenerateSchema>;
