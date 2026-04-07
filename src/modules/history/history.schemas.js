const { z } = require("zod");

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const historyWriteSchema = z.object({
  mealId: z.coerce.number().int().positive(),
  servedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z
    .enum(["manual", "random", "match", "plan"])
    .optional()
    .default("manual"),
});

module.exports = {
  historyQuerySchema,
  historyWriteSchema,
};
