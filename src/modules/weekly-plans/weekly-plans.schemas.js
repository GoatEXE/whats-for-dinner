const { z } = require("zod");
const { booleanish } = require("../../lib/validation");

const notesSchema = z.union([z.string(), z.null()]).transform((value) => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
});

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

const isoDateSchema = z
  .string()
  .refine((value) => parseIsoDate(value) !== null, "Invalid ISO date");

const createPlanSchema = z.object({
  weekStart: isoDateSchema.refine(
    (value) => parseIsoDate(value)?.getUTCDay() === 1,
    "weekStart must be a Monday",
  ),
});

const updateSlotSchema = z.object({
  mealId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  notes: notesSchema.optional(),
});

const randomSlotSchema = z
  .object({
    favoritesOnly: booleanish({ strict: true }).optional().default(false),
    fullMatchOnly: booleanish({ strict: true }).optional().default(false),
    excludeServedWithinDays: z.coerce
      .number()
      .int()
      .min(0)
      .max(365)
      .optional()
      .default(0),
    excludePlannedMeals: booleanish({ strict: true }).optional().default(true),
  })
  .default({});

const autofillSchema = z
  .object({
    favoritesOnly: booleanish({ strict: true }).optional().default(false),
    fullMatchOnly: booleanish({ strict: true }).optional().default(false),
    excludeServedWithinDays: z.coerce
      .number()
      .int()
      .min(0)
      .max(365)
      .optional()
      .default(0),
  })
  .default({});

const dayParamSchema = z.object({
  day: z.coerce.number().int().min(0).max(6),
});

const weeklyPlanIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const archivedPlansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

module.exports = {
  createPlanSchema,
  updateSlotSchema,
  randomSlotSchema,
  autofillSchema,
  dayParamSchema,
  weeklyPlanIdParamSchema,
  archivedPlansQuerySchema,
  parseIsoDate,
};
