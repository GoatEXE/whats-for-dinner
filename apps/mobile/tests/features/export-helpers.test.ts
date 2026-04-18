import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { importMeals } from '@whats-for-dinner/domain';

import {
  buildExportFilename,
  buildExportJson,
  buildExportSummary,
  mealsToExportEntries,
} from '@/features/import/export-helpers';
import * as mealsRepo from '@/db/repos/meals-repo';

import { createTestDb, type TestDatabaseContext } from '../helpers/test-db';

describe('buildExportFilename', () => {
  it('generates a timestamped .json filename from the given date', () => {
    const date = new Date(2026, 3, 12, 14, 5, 9); // Apr 12, 2026, 14:05:09
    expect(buildExportFilename(date)).toBe('whats-for-dinner-20260412-140509.json');
  });

  it('zero-pads single-digit month, day, hours, minutes, and seconds', () => {
    const date = new Date(2025, 0, 3, 8, 1, 7); // Jan 3, 2025, 08:01:07
    expect(buildExportFilename(date)).toBe('whats-for-dinner-20250103-080107.json');
  });

  it('returns a filename ending in .json when called without arguments', () => {
    const name = buildExportFilename();
    expect(name).toMatch(/^whats-for-dinner-\d{8}-\d{6}\.json$/);
  });
});

describe('mealsToExportEntries', () => {
  let context: TestDatabaseContext;

  beforeEach(() => {
    context = createTestDb();
  });

  afterEach(() => {
    context.close();
  });

  it('maps DB MealRecords to the export entry shape', () => {
    mealsRepo.create(context.db, {
      name: 'Chili',
      notes: 'Spicy',
      prepMinutes: 30,
      isFavorite: true,
      ingredients: [
        { name: 'Beans', quantityText: '2 cans', isOptional: false },
        { name: 'Chili powder', quantityText: '1 tbsp', isOptional: true },
      ],
      tags: ['comfort', 'dinner'],
    });

    const records = mealsRepo.getAll(context.db);
    const entries = mealsToExportEntries(records);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      name: 'Chili',
      notes: 'Spicy',
      prepMinutes: 30,
      isFavorite: true,
      tags: ['comfort', 'dinner'],
      ingredients: [
        { name: 'Beans', quantityText: '2 cans', isOptional: false },
        { name: 'Chili powder', quantityText: '1 tbsp', isOptional: true },
      ],
    });
  });

  it('returns an empty array for empty input', () => {
    expect(mealsToExportEntries([])).toEqual([]);
  });
});

describe('buildExportJson', () => {
  let context: TestDatabaseContext;

  beforeEach(() => {
    context = createTestDb();
  });

  afterEach(() => {
    context.close();
  });

  it('produces a valid JSON string matching the import envelope format', () => {
    mealsRepo.create(context.db, {
      name: 'Pasta',
      notes: null,
      prepMinutes: 20,
      isFavorite: false,
      ingredients: [{ name: 'Spaghetti', quantityText: '1 lb' }],
      tags: ['quick'],
    });
    mealsRepo.create(context.db, {
      name: 'Tacos',
      notes: 'Taco Tuesday',
      prepMinutes: 15,
      isFavorite: true,
      ingredients: [
        { name: 'Tortillas', quantityText: '8' },
        { name: 'Ground beef', quantityText: '1 lb' },
      ],
      tags: ['dinner'],
    });

    // getAll sorts by is_favorite DESC, name ASC — so Tacos (favorite) first
    const records = mealsRepo.getAll(context.db);
    const json = buildExportJson(records, '2026-04-12T12:00:00.000Z');
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      format: 'whats-for-dinner-recipes',
      version: 1,
      exportedAt: '2026-04-12T12:00:00.000Z',
      meals: [
        {
          name: 'Tacos',
          notes: 'Taco Tuesday',
          prepMinutes: 15,
          isFavorite: true,
          tags: ['dinner'],
          ingredients: [
            { name: 'Tortillas', quantityText: '8', isOptional: false },
            { name: 'Ground beef', quantityText: '1 lb', isOptional: false },
          ],
        },
        {
          name: 'Pasta',
          notes: null,
          prepMinutes: 20,
          isFavorite: false,
          tags: ['quick'],
          ingredients: [{ name: 'Spaghetti', quantityText: '1 lb', isOptional: false }],
        },
      ],
    });
  });

  it('generates JSON that the import flow can re-import', () => {
    mealsRepo.create(context.db, {
      name: 'Roundtrip Stew',
      notes: 'Should survive export→import',
      prepMinutes: 45,
      isFavorite: true,
      ingredients: [
        { name: 'Carrots', quantityText: '3', isOptional: false },
        { name: 'Potatoes', quantityText: '2 lbs', isOptional: false },
      ],
      tags: ['comfort'],
    });

    const records = mealsRepo.getAll(context.db);
    const json = buildExportJson(records);

    // Re-import into a fresh DB
    const freshContext = createTestDb();
    try {
      const payload = JSON.parse(json);
      const result = importMeals(payload, {
        existingMeals: [],
        importMeal: (mealData) => {
          const created = mealsRepo.create(freshContext.db, {
            name: mealData.name,
            notes: mealData.notes ?? null,
            prepMinutes: mealData.prepMinutes ?? null,
            isFavorite: mealData.isFavorite ?? false,
            ingredients: mealData.ingredients.map((i) => ({
              name: i.name,
              quantityText: i.quantityText ?? null,
              isOptional: i.isOptional ?? false,
            })),
            tags: mealData.tags ?? [],
          });
          return { name: created.name };
        },
      });

      expect(result.data.summary.importedCount).toBe(1);
      expect(result.data.imported[0]?.name).toBe('Roundtrip Stew');

      const importedMeals = mealsRepo.getAll(freshContext.db);
      expect(importedMeals).toHaveLength(1);
      expect(importedMeals[0]?.name).toBe('Roundtrip Stew');
      expect(importedMeals[0]?.ingredients.map((i) => i.name)).toEqual([
        'Carrots',
        'Potatoes',
      ]);
    } finally {
      freshContext.close();
    }
  });

  it('excludes archived meals when filtered accordingly', () => {
    mealsRepo.create(context.db, {
      name: 'Active Meal',
      ingredients: [{ name: 'Ingredient A' }],
      tags: [],
    });
    const archivedMeal = mealsRepo.create(context.db, {
      name: 'Archived Meal',
      ingredients: [{ name: 'Ingredient B' }],
      tags: [],
    });
    mealsRepo.archive(context.db, archivedMeal.id);

    // Without archived (default filter)
    const activeOnly = mealsRepo.getAll(context.db, { archived: false });
    const activeJson = buildExportJson(activeOnly);
    const activeParsed = JSON.parse(activeJson);
    expect(activeParsed.meals).toHaveLength(1);
    expect(activeParsed.meals[0].name).toBe('Active Meal');

    // With archived: fetch both active and archived separately and combine,
    // since getAll(archived: undefined) defaults to non-archived only.
    const active = mealsRepo.getAll(context.db, { archived: false });
    const archived = mealsRepo.getAll(context.db, { archived: true });
    const combined = [...active, ...archived];
    const allJson = buildExportJson(combined);
    const allParsed = JSON.parse(allJson);
    expect(allParsed.meals).toHaveLength(2);
    expect(allParsed.meals.map((m: { name: string }) => m.name)).toEqual([
      'Active Meal',
      'Archived Meal',
    ]);
  });
});

describe('buildExportSummary', () => {
  it('uses singular "meal" for count of 1', () => {
    expect(buildExportSummary(1, false)).toBe('1 meal');
  });

  it('uses plural "meals" for count > 1', () => {
    expect(buildExportSummary(5, false)).toBe('5 meals');
  });

  it('appends archived note when includesArchived is true', () => {
    expect(buildExportSummary(3, true)).toBe('3 meals (including archived)');
  });

  it('handles zero meals', () => {
    expect(buildExportSummary(0, false)).toBe('0 meals');
  });
});
