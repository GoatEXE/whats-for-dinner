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
import { resetAndReseed } from '@/db/reset';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function MealsSettingsScreen() {
  const router = useRouter();
  const { db, isReady } = useDatabase();
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="refresh-circle-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.infoTitle}>Reset demo data</Text>
          <Text style={styles.infoSubtitle}>
            Clear the library and restore the 12 sample meals, pantry items, weekly
            plan, and history. Handy between demos when you want a clean slate.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Ionicons
            name="warning-outline"
            size={20}
            color={colors.danger}
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
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
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="refresh" size={22} color={colors.white} />
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
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </ScrollView>
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
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  infoIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  infoSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
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
    color: colors.danger,
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
    backgroundColor: colors.danger,
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
    color: colors.white,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtnText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
