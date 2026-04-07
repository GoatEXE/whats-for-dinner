const { z } = require("zod");

const stringOrNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const pantryItemSchema = z
  .object({
    ingredientId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    quantityText: stringOrNull.optional(),
  })
  .refine(
    (value) => value.ingredientId || value.name,
    "ingredientId or name is required",
  );

const pantryReplaceSchema = z.object({
  items: z.array(pantryItemSchema),
});

const pantryDeleteParamSchema = z.object({
  ingredientId: z.coerce.number().int().positive(),
});

module.exports = {
  pantryItemSchema,
  pantryReplaceSchema,
  pantryDeleteParamSchema,
};
