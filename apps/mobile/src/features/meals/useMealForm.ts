import { useState, useCallback } from 'react';
import { normalizeName } from '@whats-for-dinner/domain';
import type { Meal } from '../../types';
import type { MealIngredientInput } from '../../db/types';

export interface IngredientDraft {
  name: string;
  quantityText: string;
  isOptional: boolean;
}

export interface MealFormState {
  name: string;
  notes: string;
  prepMinutes: string;
  isFavorite: boolean;
  ingredients: IngredientDraft[];
  tags: string[];
}

const emptyForm: MealFormState = {
  name: '',
  notes: '',
  prepMinutes: '',
  isFavorite: false,
  ingredients: [{ name: '', quantityText: '', isOptional: false }],
  tags: [],
};

function mealToForm(meal: Meal): MealFormState {
  return {
    name: meal.name,
    notes: meal.notes ?? '',
    prepMinutes: meal.prepMinutes != null ? String(meal.prepMinutes) : '',
    isFavorite: meal.isFavorite,
    ingredients: meal.ingredients.map((ing) => ({
      name: ing.name,
      quantityText: ing.quantityText ?? '',
      isOptional: ing.isOptional,
    })),
    tags: [...meal.tags],
  };
}

export interface MealFormPayload {
  name: string;
  notes: string | null;
  prepMinutes: number | null;
  isFavorite: boolean;
  ingredients: MealIngredientInput[];
  tags: string[];
}

export interface UseMealFormReturn {
  form: MealFormState;
  setField: <K extends keyof MealFormState>(key: K, value: MealFormState[K]) => void;
  addIngredient: () => void;
  removeIngredient: (index: number) => void;
  updateIngredient: (index: number, field: keyof IngredientDraft, value: string | boolean) => void;
  moveIngredient: (from: number, to: number) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  reset: (meal?: Meal) => void;
  validate: (existingNames: string[], editingId?: string) => string[];
  toPayload: () => MealFormPayload;
}

export function useMealForm(initial?: Meal): UseMealFormReturn {
  const [form, setForm] = useState<MealFormState>(
    initial ? mealToForm(initial) : emptyForm,
  );

  const setField = useCallback(
    <K extends keyof MealFormState>(key: K, value: MealFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addIngredient = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantityText: '', isOptional: false }],
    }));
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }, []);

  const updateIngredient = useCallback(
    (index: number, field: keyof IngredientDraft, value: string | boolean) => {
      setForm((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === index ? { ...ing, [field]: value } : ing,
        ),
      }));
    },
    [],
  );

  const moveIngredient = useCallback((from: number, to: number) => {
    setForm((prev) => {
      const list = [...prev.ingredients];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...prev, ingredients: list };
    });
  }, []);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setForm((prev) => {
      if (prev.tags.includes(trimmed)) return prev;
      return { ...prev, tags: [...prev.tags, trimmed] };
    });
  }, []);

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const reset = useCallback((meal?: Meal) => {
    setForm(meal ? mealToForm(meal) : emptyForm);
  }, []);

  const validate = useCallback(
    (existingNames: string[], editingId?: string) => {
      const errors: string[] = [];
      if (!form.name.trim()) errors.push('Meal name is required');

      const normalized = normalizeName(form.name);
      const isDuplicate = existingNames.some(
        (n) => normalizeName(n) === normalized,
      );
      if (isDuplicate && editingId == null) {
        errors.push('A meal with this name already exists');
      }

      const validIngredients = form.ingredients.filter((i) => i.name.trim());
      if (validIngredients.length === 0) {
        errors.push('At least one ingredient is required');
      }

      if (form.prepMinutes) {
        const mins = Number(form.prepMinutes);
        if (Number.isNaN(mins) || mins < 0 || mins > 1440) {
          errors.push('Prep time must be 0-1440 minutes');
        }
      }

      return errors;
    },
    [form],
  );

  const toPayload = useCallback((): MealFormPayload => {
    return {
      name: form.name.trim(),
      notes: form.notes.trim() || null,
      prepMinutes: form.prepMinutes ? Number(form.prepMinutes) : null,
      isFavorite: form.isFavorite,
      ingredients: form.ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantityText: i.quantityText.trim() || null,
          isOptional: i.isOptional,
        })),
      tags: form.tags,
    };
  }, [form]);

  return {
    form,
    setField,
    addIngredient,
    removeIngredient,
    updateIngredient,
    moveIngredient,
    addTag,
    removeTag,
    reset,
    validate,
    toPayload,
  };
}
