import { z } from "zod";

export const recipeEnvelopeSchema = z.object({
  format: z.literal("whats-for-dinner-recipes"),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  meals: z.array(z.unknown()),
});

export type RecipeEnvelope = z.infer<typeof recipeEnvelopeSchema>;
