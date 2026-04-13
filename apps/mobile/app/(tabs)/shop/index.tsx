import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan';
import { useShoppingList } from '@/features/shopping/useShoppingList';
import { useColors } from '@/hooks/useTheme';
import { EmptyState } from '@/ui/EmptyState';
import { spacing, radii, fontSizes } from '@/ui/theme';

export default function ShopScreen() {
  const router = useRouter();
  const { weekStart } = useLocalSearchParams<{ weekStart?: string | string[] }>();
  const selectedWeekStart = typeof weekStart === 'string' ? weekStart : undefined;
  const c = useColors();
  const { meals, refresh: refreshMeals } = useMeals();
  const { items: pantryItems, addItem, removeItem, refresh: refreshPantry } = usePantry();
  const { getPlannedMealIds, refresh: refreshPlan } = useWeeklyPlan(selectedWeekStart);

  // Refresh data when tab gains focus
  useFocusEffect(
    useCallback(() => {
      refreshMeals();
      refreshPantry();
      refreshPlan();
    }, [refreshMeals, refreshPantry, refreshPlan]),
  );

  // Pantry quick-add state
  const [newIngredient, setNewIngredient] = useState('');
  const [copied, setCopied] = useState(false);

  // Local checkbox state for "Need to buy" items
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const toggleChecked = useCallback((id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  // Keep clipboard copy short: item names only.
  const copyText = useMemo(() => {
    if (!shoppingList) return '';

    return [...shoppingList.requiredToBuy, ...shoppingList.optionalToBuy]
      .map((item) => item.name)
      .join('\n');
  }, [shoppingList]);

  const handleCopy = useCallback(async () => {
    if (!copyText) return;
    await Clipboard.setStringAsync(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [copyText]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.contentContainer}>
      {/* ── Pantry Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="basket-outline" size={20} color={c.accent} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Pantry</Text>
          <Pressable
            style={[styles.suggestBtn, { backgroundColor: c.accentLight }]}
            onPress={() => router.push('/(tabs)/shop/suggestions')}
            accessibilityRole="button"
            accessibilityLabel="View suggestions"
          >
            <Ionicons name="bulb-outline" size={16} color={c.accent} />
            <Text style={[styles.suggestBtnText, { color: c.accent }]}>Suggestions</Text>
          </Pressable>
        </View>

        {/* Quick-add */}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.addInput, { borderColor: c.surfaceBorder, color: c.text, backgroundColor: c.surface }]}
            value={newIngredient}
            onChangeText={setNewIngredient}
            placeholder="Add ingredient…"
            placeholderTextColor={c.textMuted}
            onSubmitEditing={handleAddPantryItem}
            returnKeyType="done"
            accessibilityLabel="Add pantry ingredient"
          />
          <Pressable
            style={[styles.addBtn, { backgroundColor: c.accent }, !newIngredient.trim() && { backgroundColor: c.textMuted }]}
            onPress={handleAddPantryItem}
            disabled={!newIngredient.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add to pantry"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Pantry list */}
        {pantryItems.length === 0 ? (
          <View style={[styles.inlineEmpty, { backgroundColor: c.surface }]}>
            <Ionicons name="basket-outline" size={20} color={c.textMuted} />
            <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
              Your pantry is empty. Add what you already have on hand so it can be
              skipped when the shopping list is built.
            </Text>
          </View>
        ) : (
          pantryItems.map((item) => (
            <View key={item.ingredientId} style={[styles.pantryItem, { borderBottomColor: c.surfaceBorder }]}>
              <View style={styles.pantryItemContent}>
                <Text style={[styles.pantryItemName, { color: c.text }]}>{item.name}</Text>
              </View>
              <Pressable
                onPress={() => removeItem(item.ingredientId)}
                hitSlop={8}
                accessibilityLabel={`Remove ${item.name} from pantry`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color={c.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* ── Shopping List Section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cart-outline" size={20} color={c.accent} />
          <Text style={[styles.sectionTitle, { color: c.text }]}>Shopping List</Text>
        </View>

        {!shoppingList || plannedMeals.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No shopping list yet"
            subtitle="Assign meals to your weekly plan and this list will group every ingredient you still need to buy."
            actions={[
              {
                label: 'Plan meals',
                icon: 'calendar-outline',
                onPress: () => router.push('/(tabs)/plan'),
                accessibilityLabel: 'Go to weekly plan',
              },
            ]}
          />
        ) : (
          <View>
            {/* Summary */}
            <View style={[styles.summaryRow, { borderBottomColor: c.surfaceBorder }]}>
              <Text style={[styles.summaryText, { color: c.textSecondary }]}>
                {shoppingList.summary.selectedMealCount} meal
                {shoppingList.summary.selectedMealCount !== 1 ? 's' : ''} ·{' '}
                {shoppingList.summary.requiredToBuyCount} to buy
              </Text>
              <Pressable
                style={[styles.copyBtn, { backgroundColor: c.accentLight }]}
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel="Copy shopping list"
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={c.accent}
                />
                <Text style={[styles.copyBtnText, { color: c.accent }]}>{copied ? 'Copied!' : 'Copy'}</Text>
              </Pressable>
            </View>

            {/* Need to Buy */}
            {shoppingList.requiredToBuy.length > 0 && (
              <View style={styles.listGroup}>
                <Text style={[styles.listGroupTitle, { color: c.textSecondary }]}>Need to buy</Text>
                {shoppingList.requiredToBuy.map((item) => {
                  const checked = checkedIds.has(item.ingredientId);
                  return (
                    <Pressable
                      key={item.ingredientId}
                      style={styles.shoppingItem}
                      onPress={() => toggleChecked(item.ingredientId)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={`${checked ? 'Uncheck' : 'Check'} ${item.name}`}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={checked ? c.success : c.accent}
                      />
                      <View style={styles.shoppingItemContent}>
                        <Text
                          style={[
                            styles.shoppingItemName,
                            { color: checked ? c.textMuted : c.text },
                            checked && styles.checkedName,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={[styles.shoppingItemHint, { color: c.textSecondary }]}>
                          {item.quantityHints.join('; ')}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* On Hand */}
            {shoppingList.requiredOnHand.length > 0 && (
              <View style={styles.listGroup}>
                <Text style={[styles.listGroupTitle, { color: c.textSecondary }]}>Already on hand</Text>
                {shoppingList.requiredOnHand.map((item) => (
                  <View key={item.ingredientId} style={styles.shoppingItem}>
                    <Ionicons name="checkmark-circle" size={18} color={c.success} />
                    <View style={styles.shoppingItemContent}>
                      <Text style={[styles.shoppingItemName, styles.onHandName, { color: c.textSecondary }]}>
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
                <Text style={[styles.listGroupTitle, { color: c.textSecondary }]}>Optional</Text>
                {shoppingList.optionalToBuy.map((item) => {
                  const checked = checkedIds.has(item.ingredientId);
                  return (
                    <Pressable
                      key={item.ingredientId}
                      style={styles.shoppingItem}
                      onPress={() => toggleChecked(item.ingredientId)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={`${checked ? 'Uncheck' : 'Check'} ${item.name}, optional`}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={checked ? c.success : c.textMuted}
                      />
                      <View style={styles.shoppingItemContent}>
                        <Text style={[
                          styles.shoppingItemName,
                          styles.optionalName,
                          { color: c.textMuted },
                          checked && styles.checkedName,
                        ]}>
                          {item.name}
                        </Text>
                        {!checked && (
                          <Text style={[styles.shoppingItemHint, { color: c.textSecondary }]}>
                            {item.quantityHints.join('; ')}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
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
    flex: 1,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  suggestBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
  },
  addInput: {
    flex: 1,
  },
  addBtn: {
    borderRadius: radii.md,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  emptyHint: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  pantryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  pantryItemContent: {
    flex: 1,
  },
  pantryItemName: {
    fontSize: fontSizes.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  copyBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  listGroup: {
    marginBottom: spacing.lg,
  },
  listGroupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
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
  },
  shoppingItemHint: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  onHandName: {
    textDecorationLine: 'line-through',
  },
  optionalName: {
    fontStyle: 'italic',
  },
  checkedName: {
    textDecorationLine: 'line-through',
  },
});
