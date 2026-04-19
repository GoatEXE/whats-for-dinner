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
import { useColors } from '../hooks/useTheme';
import { TagChip } from './TagChip';
import { colors as staticColors, spacing, radii, fontSizes } from './theme';

export interface MealFormFieldsProps {
  formHook: Pick<
    UseMealFormReturn,
    'form' | 'setField' | 'addIngredient' | 'removeIngredient' | 'updateIngredient' | 'addTag' | 'removeTag'
  >;
  autoFocusName?: boolean;
  notesLabel?: string;
  errors?: string[];
  headerContent?: React.ReactNode;
}

export function MealFormFields({
  formHook,
  autoFocusName = false,
  notesLabel = 'Instructions',
  errors,
  headerContent,
}: MealFormFieldsProps) {
  const c = useColors();
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
      {headerContent}

      {errors != null && errors.length > 0 && (
        <View style={[styles.errorBox, { backgroundColor: c.dangerLight }]}>
          {errors.map((e, i) => (
            <Text key={i} style={[styles.errorText, { color: c.danger }]}>
              • {e}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.label, { color: c.text }]}>Meal name *</Text>
      <TextInput
        style={[styles.input, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
        value={form.name}
        onChangeText={(text) => setField('name', text)}
        placeholder="e.g. Chicken Stir-Fry"
        placeholderTextColor={c.textMuted}
        autoFocus={autoFocusName}
        accessibilityLabel="Meal name"
      />

      <Text style={[styles.label, { color: c.text }]}>{notesLabel}</Text>
      <TextInput
        style={[styles.input, styles.multiline, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
        value={form.notes}
        onChangeText={(text) => setField('notes', text)}
        placeholder="Add instructions"
        placeholderTextColor={c.textMuted}
        multiline
        numberOfLines={3}
        accessibilityLabel="Instructions"
      />

      <Text style={[styles.label, { color: c.text }]}>Prep time (minutes)</Text>
      <TextInput
        style={[styles.input, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
        value={form.prepMinutes}
        onChangeText={(text) => setField('prepMinutes', text)}
        placeholder="e.g. 30"
        placeholderTextColor={c.textMuted}
        keyboardType="numeric"
        accessibilityLabel="Prep time in minutes"
      />

      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, { color: c.text }]}>Favorite</Text>
        <Switch
          value={form.isFavorite}
          onValueChange={(val) => setField('isFavorite', val)}
          trackColor={{ true: c.accent, false: c.surfaceBorder }}
          thumbColor={c.white}
        />
      </View>

      <Text style={[styles.label, { color: c.text }]}>Tags</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, styles.tagInput, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Add a tag"
          placeholderTextColor={c.textMuted}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
          accessibilityLabel="Add tag"
        />
        <Pressable
          style={[styles.tagAddBtn, { backgroundColor: c.accent }]}
          onPress={handleAddTag}
          accessibilityLabel="Add tag"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      {form.tags.length > 0 && (
        <View style={styles.tagList}>
          {form.tags.map((tag) => (
            <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
          ))}
        </View>
      )}

      <Text style={[styles.label, { color: c.text }]}>Ingredients *</Text>
      {form.ingredients.map((ing, idx) => (
        <View key={idx} style={styles.ingredientRow}>
          <View style={styles.ingredientInputs}>
            <TextInput
              style={[styles.input, styles.ingredientName, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
              value={ing.name}
              onChangeText={(text) => updateIngredient(idx, 'name', text)}
              placeholder="Ingredient name"
              placeholderTextColor={c.textMuted}
              accessibilityLabel={`Ingredient ${idx + 1} name`}
            />
            <TextInput
              style={[styles.input, styles.ingredientQty, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
              value={ing.quantityText}
              onChangeText={(text) => updateIngredient(idx, 'quantityText', text)}
              placeholder="Qty"
              placeholderTextColor={c.textMuted}
              accessibilityLabel={`Ingredient ${idx + 1} quantity`}
            />
          </View>
          <View style={styles.ingredientActions}>
            <Pressable
              onPress={() => updateIngredient(idx, 'isOptional', !ing.isOptional)}
              style={[
                styles.optionalBtn,
                { borderColor: c.surfaceBorder },
                ing.isOptional && { backgroundColor: c.accentLight, borderColor: c.accent },
              ]}
              accessibilityLabel={`Mark ingredient ${idx + 1} as ${ing.isOptional ? 'required' : 'optional'}`}
              accessibilityRole="button"
            >
              <Text style={[styles.optionalText, { color: c.textMuted }, ing.isOptional && { color: c.accent, fontWeight: '600' }]}>
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
                <Ionicons name="close-circle" size={22} color={c.danger} />
              </Pressable>
            )}
          </View>
        </View>
      ))}
      <Pressable style={styles.addIngredientBtn} onPress={addIngredient} accessibilityRole="button">
        <Ionicons name="add-circle-outline" size={20} color={c.accent} />
        <Text style={[styles.addIngredientText, { color: c.accent }]}>Add ingredient</Text>
      </Pressable>
    </>
  );
}


export const mealFormStyles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
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
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  saveBtn: {},
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  errorBox: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
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
  },
  optionalText: {
    fontSize: fontSizes.xs,
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addIngredientText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
