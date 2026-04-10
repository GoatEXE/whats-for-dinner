import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRandomPicker } from '../features/meals/useRandomPicker';
import { colors, spacing, radii, fontSizes } from './theme';
import type { Meal, PantryEntry } from '../types';

interface RandomPickerModalProps {
  visible: boolean;
  meals: Meal[];
  pantryItems: PantryEntry[];
  recentMealIds: number[];
  excludeMealIds?: number[];
  onAccept: (mealId: number, mealName: string) => void;
  onClose: () => void;
}

export function RandomPickerModal({
  visible,
  meals,
  pantryItems,
  recentMealIds,
  excludeMealIds = [],
  onAccept,
  onClose,
}: RandomPickerModalProps) {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fullMatchOnly, setFullMatchOnly] = useState(false);

  const { pick, error, roll, clear } = useRandomPicker(
    meals,
    pantryItems,
    recentMealIds,
    {
      favoritesOnly,
      fullMatchOnly,
      excludeServedWithinDays: 7,
      excludeMealIds,
    },
  );

  const handleAccept = useCallback(() => {
    if (pick) {
      onAccept(pick.meal.id, pick.meal.name);
      clear();
    }
  }, [pick, onAccept, clear]);

  const handleClose = useCallback(() => {
    clear();
    onClose();
  }, [clear, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>🎲 What's for Dinner?</Text>

          {/* Options */}
          <View style={styles.options}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Favorites only</Text>
              <Switch
                value={favoritesOnly}
                onValueChange={setFavoritesOnly}
                trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
                thumbColor={colors.white}
              />
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Pantry-ready only</Text>
              <Switch
                value={fullMatchOnly}
                onValueChange={setFullMatchOnly}
                trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* Result */}
          {pick && (
            <View style={styles.result}>
              <Text style={styles.resultLabel}>Tonight's pick:</Text>
              <Text style={styles.resultName}>{pick.meal.name}</Text>
              {pick.meal.isFavorite && (
                <Ionicons
                  name="star"
                  size={16}
                  color={colors.star}
                  style={styles.resultStar}
                />
              )}
              <Text style={styles.resultMeta}>
                {pick.candidateCount} candidate{pick.candidateCount !== 1 ? 's' : ''} available
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!pick && !error && (
            <View style={styles.placeholder}>
              <Ionicons name="dice-outline" size={48} color={colors.textMuted} />
              <Text style={styles.placeholderText}>Tap "Roll" to pick a dinner!</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {pick ? (
              <>
                <Pressable style={[styles.btn, styles.rerollBtn]} onPress={roll} accessibilityRole="button">
                  <Ionicons name="refresh" size={18} color={colors.accent} />
                  <Text style={styles.rerollText}>Re-roll</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.acceptBtn]} onPress={handleAccept} accessibilityRole="button">
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.btn, styles.rollBtn]} onPress={roll} accessibilityRole="button">
                <Ionicons name="dice-outline" size={18} color={colors.white} />
                <Text style={styles.rollText}>Roll</Text>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.closeBtn} onPress={handleClose} accessibilityRole="button">
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  options: {
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  result: {
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resultLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  resultName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
  },
  resultStar: {
    marginTop: spacing.xs,
  },
  resultMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
  },
  placeholderText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
    minHeight: 44,
  },
  rollBtn: {
    backgroundColor: colors.accent,
  },
  rollText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.white,
  },
  rerollBtn: {
    backgroundColor: colors.accentLight,
  },
  rerollText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.accent,
  },
  acceptBtn: {
    backgroundColor: colors.accent,
  },
  acceptText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.white,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
