import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useHistory } from '@/hooks/useHistory';
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan';
import { useColors } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';
import { useAutofill } from '@/features/plans/useAutofill';
import { MealPickerModal } from '@/ui/MealPickerModal';
import { RandomPickerModal } from '@/ui/RandomPickerModal';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { stringIdToNumber } from '@/db/ids';
import { spacing, radii, fontSizes } from '@/ui/theme';
import type { Meal } from '@/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const REPEAT_WINDOW_OPTIONS = [0, 3, 7, 14] as const;

export default function PlanScreen() {
  const router = useRouter();
  const c = useColors();
  const { db } = useDatabase();
  const { meals, refresh: refreshMeals } = useMeals();
  const { items: pantryItems, refresh: refreshPantry } = usePantry();
  const { refresh: refreshHistory, getRecentMealIds } = useHistory();
  const {
    plan,
    loading,
    assignSlot,
    clearSlot,
    getPlannedMealIds,
    refresh: refreshPlan,
    weekOffset,
    viewCurrentWeek,
    viewNextWeek,
  } = useWeeklyPlan();

  // Refresh all relevant data when tab gains focus
  useFocusEffect(
    useCallback(() => {
      refreshMeals();
      refreshPantry();
      refreshHistory();
      refreshPlan();
    }, [refreshMeals, refreshPantry, refreshHistory, refreshPlan]),
  );

  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [randomTargetDay, setRandomTargetDay] = useState<number | null>(null);
  const [repeatWindowDays, setRepeatWindowDays] = useState<number>(7);
  const [planMessage, setPlanMessage] = useState<{
    tone: 'error' | 'warning';
    title?: string;
    message: string;
  } | null>(null);

  // Build a reverse map from hashed number → original string ID so the
  // domain layer's numeric IDs can be resolved back to DB meal IDs.
  const numToStringId = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of meals) map.set(stringIdToNumber(m.id), m.id);
    return map;
  }, [meals]);

  // Compute recent meal IDs from history for the random picker (domain uses number)
  const recentMealIds = useMemo(() => {
    return getRecentMealIds(repeatWindowDays).map(stringIdToNumber);
  }, [getRecentMealIds, repeatWindowDays]);

  // Planned meal IDs as numbers for the domain random picker
  const excludeMealIds = useMemo(() => {
    const plannedMealIds = getPlannedMealIds();

    if (randomTargetDay == null || !plan) {
      return plannedMealIds.map(stringIdToNumber);
    }

    const currentMealId = plan.slots.find((slot) => slot.day === randomTargetDay)?.mealId;
    if (!currentMealId) {
      return plannedMealIds.map(stringIdToNumber);
    }

    const sameMealPlannedElsewhere = plan.slots.some(
      (slot) => slot.day !== randomTargetDay && slot.mealId === currentMealId,
    );

    const nextMealIds = sameMealPlannedElsewhere
      ? plannedMealIds
      : plannedMealIds.filter((mealId) => mealId !== currentMealId);

    return nextMealIds.map(stringIdToNumber);
  }, [getPlannedMealIds, plan, randomTargetDay]);

  const { autofill: autofillWeek } = useAutofill({
    db,
    planId: plan?.id ?? null,
    meals,
    pantryIngredientIds: pantryItems.map((item) => item.ingredientId),
    recentMealIds: getRecentMealIds(repeatWindowDays),
  });

  const handleSlotPress = useCallback((day: number) => {
    setPickerDay(day);
  }, []);

  const openRandomPickerForDay = useCallback((day: number) => {
    setRandomTargetDay(day);
    setShowRandomPicker(true);
  }, []);

  const handleSlotLongPress = useCallback((day: number) => {
    openRandomPickerForDay(day);
  }, [openRandomPickerForDay]);

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
      // Resolve the domain numeric ID back to the original string meal ID
      const originalId = numToStringId.get(mealId) ?? String(mealId);

      if (randomTargetDay != null) {
        // Opened from a specific day slot — assign the meal to that day
        assignSlot(randomTargetDay, originalId, mealName);
      } else {
        // Opened from the standalone "What's for Dinner?" button —
        // navigate to the meal detail screen so the user can see the pick
        router.push(`/(tabs)/meals/${originalId}`);
      }
      setShowRandomPicker(false);
      setRandomTargetDay(null);
    },
    [randomTargetDay, assignSlot, numToStringId, router],
  );

  const handleAutofill = useCallback(() => {
    const result = autofillWeek({
      favoritesOnly: false,
      fullMatchOnly: false,
      excludeServedWithinDays: repeatWindowDays,
    });

    refreshPlan();

    if (!result) {
      setPlanMessage({
        tone: 'error',
        title: 'Random fill unavailable',
        message: 'The plan is still loading. Try again in a moment.',
      });
      return;
    }

    if (result.emptyBeforeCount === 0) {
      setPlanMessage({
        tone: 'warning',
        title: 'Week already filled',
        message: 'Every day in this week already has a meal. Clear a day or use the dice button on a specific day to re-roll it.',
      });
      return;
    }

    if (result.noMoreCandidates) {
      if (result.filledCount > 0) {
        setPlanMessage({
          tone: 'warning',
          title: 'Partial week filled',
          message:
            repeatWindowDays > 0
              ? `Filled ${result.filledCount} of ${result.emptyBeforeCount} open day${result.emptyBeforeCount === 1 ? '' : 's'} before meals started repeating within ${repeatWindowDays} day${repeatWindowDays === 1 ? '' : 's'}.`
              : `Filled ${result.filledCount} of ${result.emptyBeforeCount} open day${result.emptyBeforeCount === 1 ? '' : 's'} before the app ran out of meals.`,
        });
      } else {
        setPlanMessage({
          tone: 'warning',
          title: 'No meals available',
          message:
            repeatWindowDays > 0
              ? `There were not enough meals outside the last ${repeatWindowDays} day${repeatWindowDays === 1 ? '' : 's'} to fill this week.`
              : 'There were no meals available to fill this week.',
        });
      }
      return;
    }

    setPlanMessage(null);
  }, [autofillWeek, refreshPlan, repeatWindowDays]);

  const handleGenerateShoppingList = useCallback(() => {
    if (!plan) {
      return;
    }

    router.push({
      pathname: '/(tabs)/shop',
      params: { weekStart: plan.weekStart },
    });
  }, [plan, router]);

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
        title={loading ? 'Loading your plan…' : 'Setting up this week…'}
        subtitle="A fresh weekly plan is being created for you. Hang tight — this only takes a moment."
      />
    );
  }

  const hasMeals = meals.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.weekSwitchRow}>
          <Pressable
            style={[
              styles.weekSwitchBtn,
              { backgroundColor: weekOffset === 0 ? c.accent : c.surface, borderColor: c.surfaceBorder },
            ]}
            onPress={() => {
              setPlanMessage(null);
              viewCurrentWeek();
            }}
            accessibilityRole="button"
            accessibilityLabel="View this week"
          >
            <Text style={[styles.weekSwitchText, { color: weekOffset === 0 ? '#FFFFFF' : c.text }]}>This week</Text>
          </Pressable>
          <Pressable
            style={[
              styles.weekSwitchBtn,
              { backgroundColor: weekOffset === 1 ? c.accent : c.surface, borderColor: c.surfaceBorder },
            ]}
            onPress={() => {
              setPlanMessage(null);
              viewNextWeek();
            }}
            accessibilityRole="button"
            accessibilityLabel="View next week"
          >
            <Text style={[styles.weekSwitchText, { color: weekOffset === 1 ? '#FFFFFF' : c.text }]}>Next week</Text>
          </Pressable>
        </View>

        {/* Week header */}
        <View style={styles.weekHeader}>
          <View style={styles.weekHeaderTextWrap}>
            <Text style={[styles.weekHeaderTitle, { color: c.text }]}>Plan</Text>
            <Text style={[styles.weekLabel, { color: c.textSecondary }]}>Week of {plan.weekStart}</Text>
          </View>
          <Pressable
            style={[styles.autofillBtn, { backgroundColor: c.accentLight }]}
            onPress={handleAutofill}
            accessibilityRole="button"
            accessibilityLabel="Randomly fill empty slots for this week"
          >
            <Ionicons name="flash-outline" size={16} color={c.accent} />
            <Text style={[styles.autofillText, { color: c.accent }]}>Random Fill</Text>
          </Pressable>
        </View>

        <View style={styles.repeatSection}>
          <Text style={[styles.repeatLabel, { color: c.textSecondary }]}>Repeat window</Text>
          <View style={styles.repeatOptions}>
            {REPEAT_WINDOW_OPTIONS.map((days) => {
              const isSelected = repeatWindowDays === days;
              const label = days === 0 ? 'Off' : `${days}d`;

              return (
                <Pressable
                  key={days}
                  style={[
                    styles.repeatChip,
                    {
                      backgroundColor: isSelected ? c.accent : c.surface,
                      borderColor: isSelected ? c.accent : c.surfaceBorder,
                    },
                  ]}
                  onPress={() => {
                    setRepeatWindowDays(days);
                    setPlanMessage(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Avoid repeats for ${label}`}
                >
                  <Text style={[styles.repeatChipText, { color: isSelected ? '#FFFFFF' : c.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {planMessage && (
          <ErrorBanner
            title={planMessage.title}
            message={planMessage.message}
            tone={planMessage.tone}
            onDismiss={() => setPlanMessage(null)}
          />
        )}

        {/* First-run hint when there are no meals yet */}
        {!hasMeals && (
          <View style={[styles.firstRunCard, { backgroundColor: c.accentLight, borderColor: c.accent + '30' }]}>
            <Ionicons name="restaurant-outline" size={22} color={c.accent} />
            <View style={styles.firstRunTextWrap}>
              <Text style={[styles.firstRunTitle, { color: c.text }]}>Start by adding meals</Text>
              <Text style={[styles.firstRunBody, { color: c.textSecondary }]}>
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
                { backgroundColor: c.accent },
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
              style={({ pressed }) => [
                styles.slotCard,
                { backgroundColor: c.surface, borderColor: c.surfaceBorder },
                pressed && { backgroundColor: c.background },
              ]}
              onPress={() => handleSlotPress(slot.day)}
              onLongPress={() => handleSlotLongPress(slot.day)}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_LABELS[slot.day]}: ${isEmpty ? 'Empty, tap to assign' : slot.mealName}`}
              accessibilityHint="Use the dice button for a random meal on this day"
            >
              <View style={[styles.slotDay, { backgroundColor: c.background, borderRightColor: c.surfaceBorder }]}>
                <Text style={[styles.slotDayText, { color: c.textSecondary }]}>{DAY_LABELS[slot.day]}</Text>
              </View>
              <View style={styles.slotContent}>
                {isEmpty ? (
                  <View style={styles.filledSlot}>
                    <View style={styles.emptySlot}>
                      <Ionicons name="add-circle-outline" size={20} color={c.textMuted} />
                      <Text style={[styles.emptySlotText, { color: c.textMuted }]}>Tap to assign</Text>
                    </View>
                    <View style={styles.slotActions}>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          openRandomPickerForDay(slot.day);
                        }}
                        hitSlop={8}
                        accessibilityLabel={`Randomly assign ${DAY_LABELS[slot.day]}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="dice-outline" size={20} color={c.accent} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.filledSlot}>
                    <Text style={[styles.slotMealName, { color: c.text }]} numberOfLines={1}>
                      {slot.mealName}
                    </Text>
                    <View style={styles.slotActions}>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          openRandomPickerForDay(slot.day);
                        }}
                        hitSlop={8}
                        accessibilityLabel={`Randomly reassign ${DAY_LABELS[slot.day]}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="dice-outline" size={20} color={c.accent} />
                      </Pressable>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          clearSlot(slot.day);
                        }}
                        hitSlop={8}
                        accessibilityLabel={`Clear ${DAY_LABELS[slot.day]}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle" size={20} color={c.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          <Pressable
            style={[styles.randomBtn, { backgroundColor: c.accent }]}
            onPress={() => {
              setRandomTargetDay(null);
              setShowRandomPicker(true);
            }}
            accessibilityRole="button"
          >
            <Ionicons name="dice-outline" size={20} color="#FFFFFF" />
            <Text style={styles.randomBtnText}>What's for Dinner?</Text>
          </Pressable>

          <Pressable
            style={[styles.shoppingBtn, { backgroundColor: c.accentLight }]}
            onPress={handleGenerateShoppingList}
            accessibilityRole="button"
          >
            <Ionicons name="cart-outline" size={20} color={c.accent} />
            <Text style={[styles.shoppingBtnText, { color: c.accent }]}>Generate Shopping List</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleCopyPlan}
              accessibilityRole="button"
              accessibilityLabel="Copy plan text"
            >
              <Ionicons name="copy-outline" size={18} color={c.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: c.textSecondary }]}>Copy Plan</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleViewHistory}
              accessibilityRole="button"
              accessibilityLabel="View plan history"
            >
              <Ionicons name="archive-outline" size={18} color={c.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: c.textSecondary }]}>History</Text>
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
        excludeServedWithinDays={repeatWindowDays}
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  weekSwitchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  weekSwitchBtn: {
    flex: 1,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  weekSwitchText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  weekHeaderTextWrap: {
    flex: 1,
  },
  weekHeaderTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginBottom: 2,
  },
  weekLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  repeatSection: {
    marginBottom: spacing.lg,
  },
  repeatLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  repeatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  repeatChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  repeatChipText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  autofillText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  slotDay: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRightWidth: 1,
  },
  slotDayText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
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
    fontStyle: 'italic',
  },
  filledSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotMealName: {
    fontSize: fontSizes.md,
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
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  randomBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  shoppingBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  firstRunCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  firstRunTextWrap: {
    flex: 1,
  },
  firstRunTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  firstRunBody: {
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  firstRunBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  firstRunBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
