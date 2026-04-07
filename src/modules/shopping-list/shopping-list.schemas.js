const { z } = require("zod");

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean());

const shoppingListGenerateSchema = z.object({
  mealIds: z.array(z.coerce.number().int().positive()).min(1).max(25),
  useSavedPantry: booleanish.optional().default(true),
  ingredientIds: z.array(z.coerce.number().int().positive()).optional(),
  ingredientNames: z.array(z.string().trim().min(1).max(120)).optional(),
  includeOptional: booleanish.optional().default(false),
});

module.exports = {
  shoppingListGenerateSchema,
};
