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
import { useColors } from '../hooks/useTheme';
import { useRandomPicker } from '../features/meals/useRandomPicker';
import { spacing, radii, fontSizes } from './theme';
import type { Meal, PantryEntry } from '../types';

interface RandomPickerModalProps {
  visible: boolean;
  meals: Meal[];
  pantryItems: PantryEntry[];
  recentMealIds: number[];
  excludeMealIds?: number[];
  excludeServedWithinDays?: number;
  onAccept: (mealId: number, mealName: string) => void;
  onClose: () => void;
}

export function RandomPickerModal({
  visible,
  meals,
  pantryItems,
  recentMealIds,
  excludeMealIds = [],
  excludeServedWithinDays = 7,
  onAccept,
  onClose,
}: RandomPickerModalProps) {
  const c = useColors();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fullMatchOnly, setFullMatchOnly] = useState(false);

  const { pick, error, roll, clear } = useRandomPicker(
    meals,
    pantryItems,
    recentMealIds,
    {
      favoritesOnly,
      fullMatchOnly,
      excludeServedWithinDays,
      excludeMealIds,
    },
  );

  const handleAccept = useCallback(() => {
    if (pick) { onAccept(pick.meal.id, pick.meal.name); clear(); }
  }, [pick, onAccept, clear]);

  const handleClose = useCallback(() => { clear(); onClose(); }, [clear, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={handleClose}>
        <Pressable style={[styles.dialog, { backgroundColor: c.surface }]} onPress={() => {}}>
          <Text style={[styles.title, { color: c.text }]}>🎲 What's for Dinner?</Text>

          <View style={styles.options}>
            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: c.textSecondary }]}>Favorites only</Text>
              <Switch value={favoritesOnly} onValueChange={setFavoritesOnly}
                trackColor={{ true: c.accent, false: c.surfaceBorder }} thumbColor="#FFFFFF" />
            </View>
            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: c.textSecondary }]}>Pantry-ready only</Text>
              <Switch value={fullMatchOnly} onValueChange={setFullMatchOnly}
                trackColor={{ true: c.accent, false: c.surfaceBorder }} thumbColor="#FFFFFF" />
            </View>
            <Text style={[styles.helperText, { color: c.textMuted }]}>Avoid meals served in the last {excludeServedWithinDays} day{excludeServedWithinDays === 1 ? '' : 's'}.</Text>
          </View>

          {pick && (
            <View style={[styles.result, { backgroundColor: c.accentLight }]}>
              <Text style={[styles.resultLabel, { color: c.textSecondary }]}>Tonight's pick:</Text>
              <Text style={[styles.resultName, { color: c.accent }]}>{pick.meal.name}</Text>
              {pick.meal.isFavorite && <Ionicons name="star" size={16} color={c.star} style={styles.resultStar} />}
              <Text style={[styles.resultMeta, { color: c.textMuted }]}>
                {pick.candidateCount} candidate{pick.candidateCount !== 1 ? 's' : ''} available
              </Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: c.dangerLight }]}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          )}

          {!pick && !error && (
            <View style={styles.placeholder}>
              <Ionicons name="dice-outline" size={48} color={c.textMuted} />
              <Text style={[styles.placeholderText, { color: c.textMuted }]}>Tap "Roll" to pick a dinner!</Text>
            </View>
          )}

          <View style={styles.actions}>
            {pick ? (
              <>
                <Pressable style={[styles.btn, { backgroundColor: c.accentLight }]} onPress={roll} accessibilityRole="button">
                  <Ionicons name="refresh" size={18} color={c.accent} />
                  <Text style={[styles.btnText, { color: c.accent }]}>Re-roll</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={handleAccept} accessibilityRole="button">
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Accept</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={roll} accessibilityRole="button">
                <Ionicons name="dice-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Roll</Text>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.closeBtn} onPress={handleClose} accessibilityRole="button">
            <Text style={[styles.closeText, { color: c.textMuted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  dialog: { borderRadius: radii.xl, padding: spacing.xxl, width: '100%', maxWidth: 360 },
  title: { fontSize: fontSizes.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing.lg },
  options: { marginBottom: spacing.lg },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  optionLabel: { fontSize: fontSizes.sm },
  helperText: { fontSize: fontSizes.xs, marginTop: spacing.xs },
  result: { borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  resultLabel: { fontSize: fontSizes.sm, marginBottom: spacing.xs },
  resultName: { fontSize: fontSizes.xl, fontWeight: '700', textAlign: 'center' },
  resultStar: { marginTop: spacing.xs },
  resultMeta: { fontSize: fontSizes.xs, marginTop: spacing.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { fontSize: fontSizes.sm, flex: 1 },
  placeholder: { alignItems: 'center', paddingVertical: spacing.xxl, marginBottom: spacing.lg },
  placeholderText: { fontSize: fontSizes.md, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, gap: spacing.sm, minHeight: 44 },
  btnText: { fontSize: fontSizes.md, fontWeight: '600' },
  closeBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  closeText: { fontSize: fontSizes.sm },
});
