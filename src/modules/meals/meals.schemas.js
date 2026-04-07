const { z } = require("zod");

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const stringOrNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableInteger = z.preprocess((value) => {
  if (value === "" || value == null) {
    return null;
  }

  return value;
}, z.coerce.number().int().min(0).max(1440).nullable());

const ingredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantityText: stringOrNull.optional(),
  isOptional: booleanish.optional().default(false),
});

const mealWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: stringOrNull.optional(),
  prepMinutes: nullableInteger.optional(),
  isFavorite: booleanish.optional().default(false),
  ingredients: z.array(ingredientInputSchema).min(1),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(10)
    .optional()
    .default([]),
});

const mealPatchSchema = mealWriteSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

const mealIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const mealListQuerySchema = z.object({
  favorite: booleanish.optional(),
  archived: booleanish.optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

const favoriteBodySchema = z.object({
  isFavorite: booleanish.optional(),
});

module.exports = {
  mealWriteSchema,
  mealPatchSchema,
  mealIdParamSchema,
  mealListQuerySchema,
  favoriteBodySchema,
};
