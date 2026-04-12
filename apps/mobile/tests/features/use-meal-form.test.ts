import { describe, expect, it } from 'vitest';

import { buildMealIngredientPayload } from '@/features/meals/useMealForm';

describe('buildMealIngredientPayload', () => {
  it('deduplicates repeated normalized ingredient names and preserves first casing', () => {
    expect(
      buildMealIngredientPayload([
        { name: 'Olive Oil', quantityText: '1 tbsp', isOptional: false },
        { name: ' olive   oil ', quantityText: '2 tbsp', isOptional: true },
        { name: 'Salt', quantityText: '', isOptional: true },
      ]),
    ).toEqual([
      {
        name: 'Olive Oil',
        quantityText: '1 tbsp + 2 tbsp',
        isOptional: false,
      },
      {
        name: 'Salt',
        quantityText: null,
        isOptional: true,
      },
    ]);
  });

  it('fills in later quantities when the first duplicate has none', () => {
    expect(
      buildMealIngredientPayload([
        { name: 'Garlic', quantityText: '', isOptional: true },
        { name: 'garlic', quantityText: '2 cloves', isOptional: true },
      ]),
    ).toEqual([
      {
        name: 'Garlic',
        quantityText: '2 cloves',
        isOptional: true,
      },
    ]);
  });

  it('skips blank ingredient names', () => {
    expect(
      buildMealIngredientPayload([
        { name: '  ', quantityText: '1 tsp', isOptional: false },
        { name: 'Pepper', quantityText: '', isOptional: false },
      ]),
    ).toEqual([
      {
        name: 'Pepper',
        quantityText: null,
        isOptional: false,
      },
    ]);
  });
});
