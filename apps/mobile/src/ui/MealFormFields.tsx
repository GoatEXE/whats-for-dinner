import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UseMealFormReturn } from '../features/meals/useMealForm';
import { TagChip } from './TagChip';
import { colors, spacing, radii, fontSizes } from './theme';

export interface MealFormFieldsProps {
  /** The meal form hook return — drives all field state and actions. */
  formHook: Pick<
    UseMealFormReturn,
    'form' | 'setField' | 'addIngredient' | 'removeIngredient' | 'updateIngredient' | 'addTag' | 'removeTag'
  >;

  /** Auto-focus the name field (typically true for new meals). */
  autoFocusName?: boolean;

  /** Label override for the notes field. */
  notesLabel?: string;

  /** Validation errors to display at the top. */
  errors?: string[];

  /** Optional content to render above the form fields (e.g. source badge). */
  headerContent?: React.ReactNode;
}

/**
 * Shared meal form fields used by both the edit screen and URL-import review.
 * Renders name, notes, prep time, favorite toggle, tags, and ingredients.
 * Does NOT include ScrollView, KeyboardAvoidingView, or footer buttons —
 * the parent screen owns those.
 */
export function MealFormFields({
  formHook,
  autoFocusName = false,
  notesLabel = 'Notes',
  errors,
  headerContent,
}: MealFormFieldsProps) {
  const {
    form,
    setField,
    addIngredient,
    removeIngredient,
    updateIngredient,
    addTag,
    removeTag,
  } = formHook;

  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(() => {
    if (tagInput.trim()) {
      addTag(tagInput.trim());
      setTagInput('');
    }
  }, [tagInput, addTag]);

  return (
    <>
      {/* Optional header content (e.g. source badge) */}
      {headerContent}

      {/* Errors */}
      {errors != null && errors.length > 0 && (
        <View style={styles.errorBox}>
          {errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>
              • {e}
            </Text>
          ))}
        </View>
      )}

      {/* Meal Name */}
      <Text style={styles.label}>Meal name *</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(text) => setField('name', text)}
        placeholder="e.g. Chicken Stir-Fry"
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocusName}
        accessibilityLabel="Meal name"
      />

      {/* Notes */}
      <Text style={styles.label}>{notesLabel}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={form.notes}
        onChangeText={(text) => setField('notes', text)}
        placeholder="Optional notes"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={3}
        accessibilityLabel="Notes"
      />

      {/* Prep Time */}
      <Text style={styles.label}>Prep time (minutes)</Text>
      <TextInput
        style={styles.input}
        value={form.prepMinutes}
        onChangeText={(text) => setField('prepMinutes', text)}
        placeholder="e.g. 30"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        accessibilityLabel="Prep time in minutes"
      />

      {/* Favorite */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Favorite</Text>
        <Switch
          value={form.isFavorite}
          onValueChange={(val) => setField('isFavorite', val)}
          trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
          thumbColor={colors.white}
        />
      </View>

      {/* Tags */}
      <Text style={styles.label}>Tags</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, styles.tagInput]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Add a tag"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
          accessibilityLabel="Add tag"
        />
        <Pressable
          style={styles.tagAddBtn}
          onPress={handleAddTag}
          accessibilityLabel="Add tag"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>
      {form.tags.length > 0 && (
        <View style={styles.tagList}>
          {form.tags.map((tag) => (
            <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
          ))}
        </View>
      )}

      {/* Ingredients */}
      <Text style={styles.label}>Ingredients *</Text>
      {form.ingredients.map((ing, idx) => (
        <View key={idx} style={styles.ingredientRow}>
          <View style={styles.ingredientInputs}>
            <TextInput
              style={[styles.input, styles.ingredientName]}
              value={ing.name}
              onChangeText={(text) => updateIngredient(idx, 'name', text)}
              placeholder="Ingredient name"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={`Ingredient ${idx + 1} name`}
            />
            <TextInput
              style={[styles.input, styles.ingredientQty]}
              value={ing.quantityText}
              onChangeText={(text) => updateIngredient(idx, 'quantityText', text)}
              placeholder="Qty"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={`Ingredient ${idx + 1} quantity`}
            />
          </View>
          <View style={styles.ingredientActions}>
            <Pressable
              onPress={() => updateIngredient(idx, 'isOptional', !ing.isOptional)}
              style={[styles.optionalBtn, ing.isOptional && styles.optionalBtnActive]}
              accessibilityLabel={`Mark ingredient ${idx + 1} as ${ing.isOptional ? 'required' : 'optional'}`}
              accessibilityRole="button"
            >
              <Text style={[styles.optionalText, ing.isOptional && styles.optionalTextActive]}>
                Opt
              </Text>
            </Pressable>
            {form.ingredients.length > 1 && (
              <Pressable
                onPress={() => removeIngredient(idx)}
                hitSlop={6}
                accessibilityLabel={`Remove ingredient ${idx + 1}`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      ))}
      <Pressable style={styles.addIngredientBtn} onPress={addIngredient} accessibilityRole="button">
        <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
        <Text style={styles.addIngredientText}>Add ingredient</Text>
      </Pressable>
    </>
  );
}

export const mealFormStyles = StyleSheet.create({
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cancelBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.accent,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.white,
  },
});

const styles = StyleSheet.create({
  errorBox: mealFormStyles.errorBox,
  errorText: mealFormStyles.errorText,
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
  tagAddBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  ingredientRow: {
    marginBottom: spacing.md,
  },
  ingredientInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ingredientName: {
    flex: 2,
  },
  ingredientQty: {
    flex: 1,
  },
  ingredientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  optionalBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionalBtnActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  optionalText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  optionalTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addIngredientText: {
    fontSize: fontSizes.md,
    color: colors.accent,
    fontWeight: '600',
  },
});
