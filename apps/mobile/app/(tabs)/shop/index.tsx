import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import { EmptyState } from '@/ui/EmptyState';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function ShopScreen() {
  const router = useRouter();
  const { meals } = useMeals();
  const { items: pantryItems, addItem, removeItem } = usePantry();
  const { getPlannedMealIds } = useWeeklyPlan();

  // Pantry quick-add state
  const [newIngredient, setNewIngredient] = useState('');
  const [copied, setCopied] = useState(false);

  // Get planned meals for shopping list
  const plannedMealIds = getPlannedMealIds();
  const plannedMeals = useMemo(
    () => meals.filter((m) => plannedMealIds.includes(m.id)),
    [meals, plannedMealIds],
  );
  const { result: shoppingList } = useShoppingList(plannedMeals, pantryItems);

  const handleAddPantryItem = useCallback(() => {
    const name = newIngredient.trim();
    if (!name) return;
    addItem({ name });
    setNewIngredient('');
  }, [newIngredient, addItem]);

  const handleCopy = useCallback(async () => {
    if (!shoppingList) return;
    await Clipboard.setStringAsync(shoppingList.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shoppingList]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ── Pantry Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="basket-outline" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>Pantry</Text>
          <Pressable
            style={styles.suggestBtn}
            onPress={() => router.push('/(tabs)/shop/suggestions')}
            accessibilityRole="button"
            accessibilityLabel="View suggestions"
          >
            <Ionicons name="bulb-outline" size={16} color={colors.accent} />
            <Text style={styles.suggestBtnText}>Suggestions</Text>
          </Pressable>
        </View>

        {/* Quick-add */}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.addInput]}
            value={newIngredient}
            onChangeText={setNewIngredient}
            placeholder="Add ingredient…"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleAddPantryItem}
            returnKeyType="done"
            accessibilityLabel="Add pantry ingredient"
          />
          <Pressable
            style={[styles.addBtn, !newIngredient.trim() && styles.addBtnDisabled]}
            onPress={handleAddPantryItem}
            disabled={!newIngredient.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add to pantry"
          >
            <Ionicons name="add" size={20} color={colors.white} />
          </Pressable>
        </View>

        {/* Pantry list */}
        {pantryItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            No pantry items yet. Add ingredients you have on hand.
          </Text>
        ) : (
          pantryItems.map((item) => (
            <View key={item.ingredientId} style={styles.pantryItem}>
              <View style={styles.pantryItemContent}>
                <Text style={styles.pantryItemName}>{item.name}</Text>
              </View>
              <Pressable
                onPress={() => removeItem(item.ingredientId)}
                hitSlop={8}
                accessibilityLabel={`Remove ${item.name} from pantry`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* ── Shopping List Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cart-outline" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>Shopping List</Text>
        </View>

        {!shoppingList || plannedMeals.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No shopping list yet"
            subtitle="Assign meals to your weekly plan, then the shopping list will appear here."
          />
        ) : (
          <View>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {shoppingList.summary.selectedMealCount} meal
                {shoppingList.summary.selectedMealCount !== 1 ? 's' : ''} ·{' '}
                {shoppingList.summary.requiredToBuyCount} to buy
              </Text>
              <Pressable
                style={styles.copyBtn}
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel="Copy shopping list"
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </Pressable>
            </View>

            {/* Need to Buy */}
            {shoppingList.requiredToBuy.length > 0 && (
              <View style={styles.listGroup}>
                <Text style={styles.listGroupTitle}>Need to buy</Text>
                {shoppingList.requiredToBuy.map((item) => (
                  <View key={item.ingredientId} style={styles.shoppingItem}>
                    <Ionicons name="square-outline" size={18} color={colors.accent} />
                    <View style={styles.shoppingItemContent}>
                      <Text style={styles.shoppingItemName}>{item.name}</Text>
                      <Text style={styles.shoppingItemHint}>
                        {item.quantityHints.join('; ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* On Hand */}
            {shoppingList.requiredOnHand.length > 0 && (
              <View style={styles.listGroup}>
                <Text style={styles.listGroupTitle}>Already on hand</Text>
                {shoppingList.requiredOnHand.map((item) => (
                  <View key={item.ingredientId} style={styles.shoppingItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <View style={styles.shoppingItemContent}>
                      <Text style={[styles.shoppingItemName, styles.onHandName]}>
                        {item.name}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Optional */}
            {shoppingList.optionalToBuy.length > 0 && (
              <View style={styles.listGroup}>
                <Text style={styles.listGroupTitle}>Optional</Text>
                {shoppingList.optionalToBuy.map((item) => (
                  <View key={item.ingredientId} style={styles.shoppingItem}>
                    <Ionicons name="square-outline" size={18} color={colors.textMuted} />
                    <View style={styles.shoppingItemContent}>
                      <Text style={[styles.shoppingItemName, styles.optionalName]}>
                        {item.name}
                      </Text>
                      <Text style={styles.shoppingItemHint}>
                        {item.quantityHints.join('; ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
  },
  suggestBtnText: {
    fontSize: fontSizes.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  addInput: {
    flex: 1,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  emptyHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  pantryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  pantryItemContent: {
    flex: 1,
  },
  pantryItemName: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accentLight,
  },
  copyBtnText: {
    fontSize: fontSizes.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  listGroup: {
    marginBottom: spacing.lg,
  },
  listGroupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  shoppingItemContent: {
    flex: 1,
  },
  shoppingItemName: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  shoppingItemHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  onHandName: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  optionalName: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
