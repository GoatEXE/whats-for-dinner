import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { IngredientRow } from '@/ui/IngredientRow';
import { TagChip } from '@/ui/TagChip';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { EmptyState } from '@/ui/EmptyState';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function MealDetailScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const router = useRouter();
  const { getMealById, toggleFavorite, archiveMeal, deleteMeal } = useMeals();
  const [showDelete, setShowDelete] = useState(false);

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with name and actions */}
        <View style={styles.headerRow}>
          <Text style={styles.name}>{meal.name}</Text>
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
              color={colors.star}
            />
          </Pressable>
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          {meal.prepMinutes != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{meal.prepMinutes} min</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="nutrition-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{meal.ingredients.length} ingredients</Text>
          </View>
          {meal.isArchived && (
            <View style={[styles.metaItem, styles.archivedBadge]}>
              <Text style={styles.archivedText}>Archived</Text>
            </View>
          )}
        </View>

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
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{meal.notes}</Text>
          </View>
        )}

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
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
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={handleEdit} accessibilityRole="button">
          <Ionicons name="pencil" size={20} color={colors.accent} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={handleToggleArchived}
          accessibilityRole="button"
        >
          <Ionicons
            name={meal.isArchived ? 'arrow-undo' : 'archive'}
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.actionTextSecondary}>
            {meal.isArchived ? 'Restore' : 'Archive'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => setShowDelete(true)}
          accessibilityRole="button"
        >
          <Ionicons name="trash" size={20} color={colors.danger} />
          <Text style={styles.actionTextDanger}>Delete</Text>
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
    backgroundColor: colors.background,
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
    color: colors.text,
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
    color: colors.textSecondary,
  },
  archivedBadge: {
    backgroundColor: colors.surfaceBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  archivedText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
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
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notes: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
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
    color: colors.accent,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  actionTextSecondary: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  actionTextDanger: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
