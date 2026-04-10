import { z } from "zod";

import { booleanish } from "./validation";

export const notesSchema = z.union([z.string(), z.null()]).transform((value) => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
});

export function parseIsoDate(value: string) {
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

export const isoDateSchema = z
  .string()
  .refine((value) => parseIsoDate(value) !== null, "Invalid ISO date");

export const createPlanSchema = z.object({
  weekStart: isoDateSchema.refine(
    (value) => parseIsoDate(value)?.getUTCDay() === 1,
    "weekStart must be a Monday",
  ),
});

export const updateSlotSchema = z.object({
  mealId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  notes: notesSchema.optional(),
});

export const randomSlotSchema = z
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

export const autofillSchema = z
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

export const dayParamSchema = z.object({
  day: z.coerce.number().int().min(0).max(6),
});

export const weeklyPlanIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const archivedPlansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type Notes = z.infer<typeof notesSchema>;
export type IsoDate = z.infer<typeof isoDateSchema>;
export type CreatePlan = z.infer<typeof createPlanSchema>;
export type UpdateSlot = z.infer<typeof updateSlotSchema>;
export type RandomSlot = z.infer<typeof randomSlotSchema>;
export type Autofill = z.infer<typeof autofillSchema>;
export type DayParam = z.infer<typeof dayParamSchema>;
export type WeeklyPlanIdParam = z.infer<typeof weeklyPlanIdParamSchema>;
export type ArchivedPlansQuery = z.infer<typeof archivedPlansQuerySchema>;
