import { z } from "zod";

import { booleanish } from "./validation";

export const matchBodySchema = z
  .object({
    ingredientIds: z.array(z.coerce.number().int().positive()).optional(),
    ingredientNames: z.array(z.string().trim().min(1).max(120)).optional(),
    useSavedPantry: booleanish().optional().default(false),
    favoritesOnly: booleanish().optional().default(false),
    includePartial: booleanish().optional().default(true),
  })
  .refine(
    (value) =>
      value.useSavedPantry ||
      (value.ingredientIds && value.ingredientIds.length > 0) ||
      (value.ingredientNames && value.ingredientNames.length > 0),
    "Provide ingredientIds, ingredientNames, or set useSavedPantry=true",
  );

export const randomQuerySchema = z.object({
  favoritesOnly: booleanish().optional().default(false),
  fullMatchOnly: booleanish().optional().default(false),
  excludeServedWithinDays: z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .optional()
    .default(0),
});

export type MatchBody = z.infer<typeof matchBodySchema>;
export type RandomQuery = z.infer<typeof randomQuerySchema>;
