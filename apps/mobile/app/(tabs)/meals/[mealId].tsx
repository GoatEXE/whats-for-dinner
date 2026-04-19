import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useColors } from '@/hooks/useTheme';
import { IngredientRow } from '@/ui/IngredientRow';
import { TagChip } from '@/ui/TagChip';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { EmptyState } from '@/ui/EmptyState';
import { spacing, radii, fontSizes } from '@/ui/theme';

export default function MealDetailScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const router = useRouter();
  const c = useColors();
  const { getMealById, toggleFavorite, archiveMeal, deleteMeal } = useMeals();
  const { addItem } = usePantry();
  const [showDelete, setShowDelete] = useState(false);
  const [pantryFeedback, setPantryFeedback] = useState<string | null>(null);
  const pantryFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meal = mealId ? getMealById(mealId) : null;

  const handleEdit = useCallback(() => {
    if (mealId) {
      router.push({ pathname: '/(tabs)/meals/edit', params: { id: mealId } });
    }
  }, [router, mealId]);

  const handleDelete = useCallback(() => {
    setShowDelete(false);
    if (mealId) {
      deleteMeal(mealId);
      router.back();
    }
  }, [deleteMeal, mealId, router]);

  const handleToggleFavorite = useCallback(() => {
    if (mealId) {
      toggleFavorite(mealId);
    }
  }, [toggleFavorite, mealId]);

  const handleToggleArchived = useCallback(() => {
    if (mealId && meal) {
      archiveMeal(mealId, !meal.isArchived);
    }
  }, [archiveMeal, mealId, meal]);

  const handleAddAllToPantry = useCallback(() => {
    if (!meal) {
      return;
    }

    try {
      meal.ingredients.forEach((ingredient) => {
        addItem(ingredient.name);
      });

      const ingredientCount = meal.ingredients.length;
      setPantryFeedback(
        `${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'} added to pantry`,
      );
    } catch (error) {
      Alert.alert(
        'Could not update pantry',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [addItem, meal]);

  useEffect(() => {
    if (!pantryFeedback) {
      return undefined;
    }

    if (pantryFeedbackTimeoutRef.current) {
      clearTimeout(pantryFeedbackTimeoutRef.current);
    }

    pantryFeedbackTimeoutRef.current = setTimeout(() => {
      setPantryFeedback(null);
      pantryFeedbackTimeoutRef.current = null;
    }, 2500);

    return () => {
      if (pantryFeedbackTimeoutRef.current) {
        clearTimeout(pantryFeedbackTimeoutRef.current);
        pantryFeedbackTimeoutRef.current = null;
      }
    };
  }, [pantryFeedback]);

  if (!meal) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Meal not found"
        subtitle="This meal may have been deleted"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with name and actions */}
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: c.text }]}>{meal.name}</Text>
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={8}
            accessibilityLabel={
              meal.isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            accessibilityRole="button"
          >
            <Ionicons
              name={meal.isFavorite ? 'star' : 'star-outline'}
              size={24}
              color={c.star}
            />
          </Pressable>
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          {meal.prepMinutes != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.metaText, { color: c.textSecondary }]}>{meal.prepMinutes} min</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="nutrition-outline" size={16} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>{meal.ingredients.length} ingredients</Text>
          </View>
          {meal.isArchived && (
            <View style={[styles.metaItem, styles.archivedBadge, { backgroundColor: c.surfaceBorder }]}>
              <Text style={[styles.archivedText, { color: c.textSecondary }]}>Archived</Text>
            </View>
          )}
        </View>

        {/* Source link */}
        {meal.sourceUrl && meal.sourceHost && (
          <Pressable
            style={[styles.sourceLink, { backgroundColor: c.accentLight }]}
            onPress={() => Linking.openURL(meal.sourceUrl!)}
            accessibilityRole="link"
            accessibilityLabel={`View original recipe on ${meal.sourceHost}`}
          >
            <Ionicons name="link-outline" size={14} color={c.accent} />
            <Text style={[styles.sourceLinkText, { color: c.accent }]} numberOfLines={1}>
              {meal.sourceHost}
            </Text>
            <Ionicons name="open-outline" size={12} color={c.textMuted} />
          </Pressable>
        )}

        {/* Tags */}
        {meal.tags.length > 0 && (
          <View style={styles.tags}>
            {meal.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        )}

        {/* Notes */}
        {meal.notes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Notes</Text>
            <Text style={[styles.notes, { color: c.textSecondary }]}>{meal.notes}</Text>
          </View>
        )}

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Ingredients</Text>
          <Pressable
            style={[styles.pantryAddBtn, { backgroundColor: c.accentLight, borderColor: c.accent }]}
            onPress={handleAddAllToPantry}
            accessibilityRole="button"
            accessibilityLabel="Add all ingredients to pantry"
          >
            <Ionicons name="basket-outline" size={18} color={c.accent} />
            <Text style={[styles.pantryAddBtnText, { color: c.accent }]}>Add All to Pantry</Text>
          </Pressable>
          {pantryFeedback && (
            <View
              style={[
                styles.pantryFeedback,
                { backgroundColor: c.successLight, borderColor: c.success },
              ]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Ionicons name="checkmark-circle" size={18} color={c.success} />
              <Text style={[styles.pantryFeedbackText, { color: c.success }]}>
                {pantryFeedback}
              </Text>
            </View>
          )}
          {meal.ingredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.id}
              name={ingredient.name}
              quantityText={ingredient.quantityText}
              isOptional={ingredient.isOptional}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.actions, { borderTopColor: c.surfaceBorder, backgroundColor: c.surface }]}>
        <Pressable style={styles.actionBtn} onPress={handleEdit} accessibilityRole="button">
          <Ionicons name="pencil" size={20} color={c.accent} />
          <Text style={[styles.actionText, { color: c.accent }]}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={handleToggleArchived}
          accessibilityRole="button"
        >
          <Ionicons
            name={meal.isArchived ? 'arrow-undo' : 'archive'}
            size={20}
            color={c.textSecondary}
          />
          <Text style={[styles.actionTextSecondary, { color: c.textSecondary }]}>
            {meal.isArchived ? 'Restore' : 'Archive'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => setShowDelete(true)}
          accessibilityRole="button"
        >
          <Ionicons name="trash" size={20} color={c.danger} />
          <Text style={[styles.actionTextDanger, { color: c.danger }]}>Delete</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={showDelete}
        title="Delete meal?"
        message={`"${meal.name}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSizes.sm,
  },
  archivedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  archivedText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sourceLinkText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    maxWidth: 200,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notes: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  pantryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    minHeight: 44,
  },
  pantryAddBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  pantryFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  pantryFeedbackText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  actionText: {
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  actionTextSecondary: {
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  actionTextDanger: {
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
