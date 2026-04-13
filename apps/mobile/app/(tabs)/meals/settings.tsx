import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '@/hooks/useDatabase';
import { useTheme, useColors } from '@/hooks/useTheme';
import { resetAndReseed } from '@/db/reset';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { type ThemePreference, spacing, radii, fontSizes } from '@/ui/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function MealsSettingsScreen() {
  const router = useRouter();
  const { db, isReady } = useDatabase();
  const { preference, setPreference } = useTheme();
  const c = useColors();
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const performReset = useCallback(() => {
    if (!db) {
      setLocalError('Database is not ready yet. Please try again in a moment.');
      return;
    }
    setLocalError(null);
    setWorking(true);
    try {
      resetAndReseed(db);
      setWorking(false);
      Alert.alert(
        'Demo data reset',
        'Your library now holds the 12 sample meals, pantry, and plan. Pull down on the meals list to refresh the view.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      setWorking(false);
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Reset failed for an unknown reason.',
      );
    }
  }, [db, router]);

  const handleResetPress = useCallback(() => {
    if (working) return;
    Alert.alert(
      'Reset demo data?',
      'This will delete all your meals, pantry items, plan slots, and history, then reload the 12 sample meals for a fresh demo. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: performReset,
        },
      ],
    );
  }, [performReset, working]);

  const disabled = working || !isReady || !db;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Appearance ── */}
        <Text style={[styles.sectionHeader, { color: c.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          {THEME_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt.value}
              style={[
                styles.themeRow,
                idx < THEME_OPTIONS.length - 1 && [styles.themeRowBorder, { borderBottomColor: c.surfaceBorder }],
              ]}
              onPress={() => setPreference(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === opt.value }}
              accessibilityLabel={`${opt.label} theme`}
            >
              <Ionicons
                name={opt.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={c.textSecondary}
                style={styles.themeIcon}
              />
              <Text style={[styles.themeLabel, { color: c.text }]}>{opt.label}</Text>
              {preference === opt.value && (
                <Ionicons name="checkmark" size={20} color={c.accent} />
              )}
            </Pressable>
          ))}
        </View>

        {/* ── Demo data ── */}
        <Text style={[styles.sectionHeader, { color: c.textSecondary }]}>Demo Data</Text>
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: c.accentLight }]}>
            <Ionicons name="refresh-circle-outline" size={36} color={c.accent} />
          </View>
          <Text style={[styles.infoTitle, { color: c.text }]}>Reset demo data</Text>
          <Text style={[styles.infoSubtitle, { color: c.textSecondary }]}>
            Clear the library and restore the 12 sample meals, pantry items, weekly
            plan, and history. Handy between demos when you want a clean slate.
          </Text>
        </View>

        <View style={[styles.warningCard, { backgroundColor: c.dangerLight, borderColor: c.danger }]}>
          <Ionicons
            name="warning-outline"
            size={20}
            color={c.danger}
            style={styles.warningIcon}
          />
          <Text style={[styles.warningText, { color: c.danger }]}>
            Everything in this app will be erased and replaced with sample data. You
            cannot undo this action.
          </Text>
        </View>

        {localError && (
          <View style={styles.bannerWrap}>
            <ErrorBanner
              title="Reset failed"
              message={localError}
              onDismiss={() => setLocalError(null)}
            />
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.resetBtn,
            pressed && !disabled && styles.resetBtnPressed,
            disabled && styles.resetBtnDisabled,
          ]}
          onPress={handleResetPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Reset demo data"
          accessibilityHint="Wipes all data and restores sample meals"
        >
          {working ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.resetBtnText}>Reset to Sample Data</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          disabled={working}
        >
          <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
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
  sectionHeader: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  themeRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeIcon: {
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  themeLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  infoCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  infoIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  infoSubtitle: {
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  bannerWrap: {
    marginBottom: spacing.lg,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#EF4444',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  resetBtnPressed: {
    opacity: 0.85,
  },
  resetBtnDisabled: {
    opacity: 0.5,
  },
  resetBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
