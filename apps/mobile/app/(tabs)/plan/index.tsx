import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useHistory } from '@/hooks/useHistory';
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan';
import { MealPickerModal } from '@/ui/MealPickerModal';
import { RandomPickerModal } from '@/ui/RandomPickerModal';
import { EmptyState } from '@/ui/EmptyState';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';
import type { Meal } from '@/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function PlanScreen() {
  const router = useRouter();
  const { meals } = useMeals();
  const { items: pantryItems } = usePantry();
  const { entries: historyEntries } = useHistory();
  const {
    plan,
    assignSlot,
    clearSlot,
    autofill,
    getPlannedMealIds,
  } = useWeeklyPlan();

  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [randomTargetDay, setRandomTargetDay] = useState<number | null>(null);

  // Compute recent meal IDs from history for the random picker (domain uses number)
  const recentMealIds = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return historyEntries
      .filter((h) => h.servedOn >= cutoffStr)
      .map((h) => Number(h.mealId) || h.mealId.charCodeAt(0));
  }, [historyEntries]);

  // Planned meal IDs as numbers for the domain random picker
  const excludeMealIds = useMemo(() => {
    return getPlannedMealIds().map(
      (id) => Number(id) || id.charCodeAt(0),
    );
  }, [getPlannedMealIds]);

  const handleSlotPress = useCallback((day: number) => {
    setPickerDay(day);
  }, []);

  const handleSlotLongPress = useCallback(
    (day: number) => {
      const slot = plan?.slots.find((s) => s.day === day);
      if (slot?.mealId) {
        clearSlot(day);
      } else {
        setRandomTargetDay(day);
        setShowRandomPicker(true);
      }
    },
    [plan, clearSlot],
  );

  const handleMealSelected = useCallback(
    (meal: Meal) => {
      if (pickerDay != null) {
        assignSlot(pickerDay, meal.id, meal.name);
        setPickerDay(null);
      }
    },
    [pickerDay, assignSlot],
  );

  const handleRandomAccept = useCallback(
    (mealId: number, mealName: string) => {
      if (randomTargetDay != null) {
        assignSlot(randomTargetDay, String(mealId), mealName);
      }
      setShowRandomPicker(false);
      setRandomTargetDay(null);
    },
    [randomTargetDay, assignSlot],
  );

  const handleAutofill = useCallback(() => {
    autofill();
  }, [autofill]);

  const handleGenerateShoppingList = useCallback(() => {
    router.push('/(tabs)/shop');
  }, [router]);

  const handleCopyPlan = useCallback(async () => {
    if (!plan) return;
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const lines = [`Week of ${plan.weekStart}`, ''];
    for (const slot of plan.slots) {
      lines.push(`${dayLabels[slot.day]}: ${slot.mealName ?? '—'}`);
    }
    await Clipboard.setStringAsync(lines.join('\n'));
  }, [plan]);

  const handleViewHistory = useCallback(() => {
    router.push('/(tabs)/plan/history');
  }, [router]);

  if (!plan) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="Setting up this week…"
        subtitle="A fresh weekly plan is being created for you. Hang tight — this only takes a moment."
      />
    );
  }

  const hasMeals = meals.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Week header */}
        <View style={styles.weekHeader}>
          <Text style={styles.weekLabel}>Week of {plan.weekStart}</Text>
          <Pressable
            style={styles.autofillBtn}
            onPress={handleAutofill}
            accessibilityRole="button"
            accessibilityLabel="Autofill empty slots"
          >
            <Ionicons name="flash-outline" size={16} color={colors.accent} />
            <Text style={styles.autofillText}>Autofill</Text>
          </Pressable>
        </View>

        {/* First-run hint when there are no meals yet */}
        {!hasMeals && (
          <View style={styles.firstRunCard}>
            <Ionicons name="restaurant-outline" size={22} color={colors.accent} />
            <View style={styles.firstRunTextWrap}>
              <Text style={styles.firstRunTitle}>Start by adding meals</Text>
              <Text style={styles.firstRunBody}>
                You need recipes before you can plan a week. Add meals on the Meals
                tab, then come back here to drop them into days.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/meals')}
              accessibilityRole="button"
              accessibilityLabel="Open meals tab to add recipes"
              style={({ pressed }) => [
                styles.firstRunBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.firstRunBtnText}>Meals</Text>
            </Pressable>
          </View>
        )}

        {/* Day slots */}
        {plan.slots.map((slot) => {
          const isEmpty = slot.mealId == null;
          return (
            <Pressable
              key={slot.day}
              style={({ pressed }) => [styles.slotCard, pressed && styles.slotCardPressed]}
              onPress={() => handleSlotPress(slot.day)}
              onLongPress={() => handleSlotLongPress(slot.day)}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_LABELS[slot.day]}: ${isEmpty ? 'Empty, tap to assign' : slot.mealName}`}
              accessibilityHint="Long press for options"
            >
              <View style={styles.slotDay}>
                <Text style={styles.slotDayText}>{DAY_LABELS[slot.day]}</Text>
              </View>
              <View style={styles.slotContent}>
                {isEmpty ? (
                  <View style={styles.emptySlot}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.emptySlotText}>Tap to assign</Text>
                  </View>
                ) : (
                  <View style={styles.filledSlot}>
                    <Text style={styles.slotMealName} numberOfLines={1}>
                      {slot.mealName}
                    </Text>
                    <Pressable
                      onPress={() => clearSlot(slot.day)}
                      hitSlop={8}
                      accessibilityLabel={`Clear ${DAY_LABELS[slot.day]}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          <Pressable
            style={styles.randomBtn}
            onPress={() => {
              setRandomTargetDay(null);
              setShowRandomPicker(true);
            }}
            accessibilityRole="button"
          >
            <Ionicons name="dice-outline" size={20} color={colors.white} />
            <Text style={styles.randomBtnText}>What's for Dinner?</Text>
          </Pressable>

          <Pressable
            style={styles.shoppingBtn}
            onPress={handleGenerateShoppingList}
            accessibilityRole="button"
          >
            <Ionicons name="cart-outline" size={20} color={colors.accent} />
            <Text style={styles.shoppingBtnText}>Generate Shopping List</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleCopyPlan}
              accessibilityRole="button"
              accessibilityLabel="Copy plan text"
            >
              <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.secondaryBtnText}>Copy Plan</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleViewHistory}
              accessibilityRole="button"
              accessibilityLabel="View plan history"
            >
              <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.secondaryBtnText}>History</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Meal Picker */}
      <MealPickerModal
        visible={pickerDay != null}
        meals={meals}
        onSelect={handleMealSelected}
        onClose={() => setPickerDay(null)}
      />

      {/* Random Picker */}
      <RandomPickerModal
        visible={showRandomPicker}
        meals={meals}
        pantryItems={pantryItems}
        recentMealIds={recentMealIds}
        excludeMealIds={excludeMealIds}
        onAccept={handleRandomAccept}
        onClose={() => {
          setShowRandomPicker(false);
          setRandomTargetDay(null);
        }}
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
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  weekLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
  },
  autofillText: {
    fontSize: fontSizes.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  slotCardPressed: {
    backgroundColor: colors.surface,
  },
  slotDay: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
  },
  slotDayText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  slotContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptySlotText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  filledSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotMealName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  bottomActions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  randomBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  shoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  shoppingBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.accent,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  firstRunCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  firstRunTextWrap: {
    flex: 1,
  },
  firstRunTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  firstRunBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  firstRunBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  firstRunBtnText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
