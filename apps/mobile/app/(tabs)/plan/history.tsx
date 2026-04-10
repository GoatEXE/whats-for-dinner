import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useDatabase } from '@/hooks/useDatabase';
import * as plansRepo from '@/db/repos/weekly-plans-repo';
import { EmptyState } from '@/ui/EmptyState';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';
import type { WeeklyPlanWithSlots } from '@/db/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function formatPlanText(plan: WeeklyPlanWithSlots): string {
  const lines = [`Week of ${plan.weekStart}`, ''];
  for (const slot of plan.slots) {
    const label = DAY_LABELS[slot.day] ?? `Day ${slot.day}`;
    const meal = slot.mealName ?? '—';
    lines.push(`${label}: ${meal}`);
  }
  return lines.join('\n');
}

export default function HistoryScreen() {
  const router = useRouter();
  const { db } = useDatabase();

  const [archivedPlans, setArchivedPlans] = useState<WeeklyPlanWithSlots[]>([]);

  // Load archived plans whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!db) {
        setArchivedPlans([]);
        return;
      }
      setArchivedPlans(plansRepo.listArchived(db, 50));
    }, [db]),
  );

  const handleCopy = useCallback(async (plan: WeeklyPlanWithSlots) => {
    await Clipboard.setStringAsync(formatPlanText(plan));
  }, []);

  if (archivedPlans.length === 0) {
    return (
      <EmptyState
        icon="archive-outline"
        title="No past plans yet"
        subtitle="When you roll a weekly plan over, the previous week lands here so you can copy it or review what you cooked."
        actions={[
          {
            label: 'Back to this week',
            icon: 'calendar-outline',
            variant: 'secondary',
            onPress: () => router.back(),
            accessibilityLabel: 'Go back to current week plan',
          },
        ]}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={archivedPlans}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PlanCard plan={item} onCopy={() => handleCopy(item)} />
      )}
    />
  );
}

function PlanCard({
  plan,
  onCopy,
}: {
  plan: WeeklyPlanWithSlots;
  onCopy: () => void;
}) {
  const assignedCount = plan.slots.filter((s) => s.mealId != null).length;
  const servedCount = plan.slots.filter((s) => s.servedAt != null).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardWeek}>Week of {plan.weekStart}</Text>
          <Text style={styles.cardSummary}>
            {assignedCount} meals planned · {servedCount} served
          </Text>
        </View>
        <Pressable
          onPress={onCopy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Copy plan text"
          style={styles.copyBtn}
        >
          <Ionicons name="copy-outline" size={18} color={colors.accent} />
        </Pressable>
      </View>

      {plan.slots.map((slot) => (
        <View key={slot.day} style={styles.slotRow}>
          <Text style={styles.slotDay}>{DAY_LABELS[slot.day]}</Text>
          <Text
            style={[styles.slotMeal, !slot.mealId && styles.slotEmpty]}
            numberOfLines={1}
          >
            {slot.mealName ?? '—'}
          </Text>
          {slot.servedAt && (
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          )}
        </View>
      ))}
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  cardWeek: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardSummary: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  copyBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accentLight,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  slotDay: {
    width: 40,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  slotMeal: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  slotEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
