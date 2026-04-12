import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMeals } from '@/hooks/useMeals';
import { useMealForm } from '@/features/meals/useMealForm';
import { MealFormFields, mealFormStyles } from '@/ui/MealFormFields';
import { colors, spacing, fontSizes } from '@/ui/theme';

export default function EditMealScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { meals, getMealById, createMeal, updateMeal } = useMeals();

  const editingId = params.id ?? undefined;
  const existingMeal = editingId ? getMealById(editingId) : undefined;

  const formHook = useMealForm(existingMeal ?? undefined);
  const { validate, toPayload } = formHook;

  const [errors, setErrors] = useState<string[]>([]);

  const isEditing = editingId != null;

  const handleSave = useCallback(() => {
    const existingNames = meals
      .filter((m) => m.id !== editingId)
      .map((m) => m.name);
    const validationErrors = validate(existingNames, editingId);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    const payload = toPayload();

    try {
      if (isEditing && editingId != null) {
        updateMeal(editingId, {
          name: payload.name,
          notes: payload.notes,
          prepMinutes: payload.prepMinutes,
          isFavorite: payload.isFavorite,
          ingredients: payload.ingredients,
          tags: payload.tags,
        });
      } else {
        createMeal({
          name: payload.name,
          notes: payload.notes,
          prepMinutes: payload.prepMinutes,
          isFavorite: payload.isFavorite,
          ingredients: payload.ingredients,
          tags: payload.tags,
        });
      }
      router.back();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Failed to save meal']);
    }
  }, [meals, editingId, validate, toPayload, isEditing, createMeal, updateMeal, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <MealFormFields
          formHook={formHook}
          autoFocusName={!isEditing}
          errors={errors}
        />
      </ScrollView>

      {/* Save / Cancel */}
      <View style={mealFormStyles.footer}>
        <Pressable
          style={[mealFormStyles.footerBtn, mealFormStyles.cancelBtn]}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={mealFormStyles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[mealFormStyles.footerBtn, mealFormStyles.saveBtn]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={mealFormStyles.saveBtnText}>{isEditing ? 'Update' : 'Save'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
