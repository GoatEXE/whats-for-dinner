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
import { useColors } from '@/hooks/useTheme';
import * as plansRepo from '@/db/repos/weekly-plans-repo';
import { EmptyState } from '@/ui/EmptyState';
import { spacing, radii, fontSizes } from '@/ui/theme';
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
  const c = useColors();
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
      style={[styles.container, { backgroundColor: c.background }]}
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
  const c = useColors();
  const assignedCount = plan.slots.filter((s) => s.mealId != null).length;
  const servedCount = plan.slots.filter((s) => s.servedAt != null).length;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
      <View style={[styles.cardHeader, { borderBottomColor: c.surfaceBorder }]}>
        <View>
          <Text style={[styles.cardWeek, { color: c.text }]}>Week of {plan.weekStart}</Text>
          <Text style={[styles.cardSummary, { color: c.textSecondary }]}>
            {assignedCount} meals planned · {servedCount} served
          </Text>
        </View>
        <Pressable
          onPress={onCopy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Copy plan text"
          style={[styles.copyBtn, { backgroundColor: c.accentLight }]}
        >
          <Ionicons name="copy-outline" size={18} color={c.accent} />
        </Pressable>
      </View>

      {plan.slots.map((slot) => (
        <View key={slot.day} style={[styles.slotRow, { borderBottomColor: c.surfaceBorder }]}>
          <Text style={[styles.slotDay, { color: c.textSecondary }]}>{DAY_LABELS[slot.day]}</Text>
          <Text
            style={[
              styles.slotMeal,
              { color: c.text },
              !slot.mealId && { color: c.textMuted, fontStyle: 'italic' },
            ]}
            numberOfLines={1}
          >
            {slot.mealName ?? '—'}
          </Text>
          {slot.servedAt && (
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
          )}
        </View>
      ))}
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
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  cardWeek: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  cardSummary: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  copyBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotDay: {
    width: 40,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  slotMeal: {
    flex: 1,
    fontSize: fontSizes.md,
  },
});
