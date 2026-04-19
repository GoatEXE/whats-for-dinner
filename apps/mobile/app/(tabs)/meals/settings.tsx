import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useColors } from '@/hooks/useTheme';
import { type ThemePreference, spacing, radii, fontSizes } from '@/ui/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function MealsSettingsScreen() {
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const c = useColors();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
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

        <Pressable
          style={styles.doneBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={[styles.doneBtnText, { color: c.textSecondary }]}>Done</Text>
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
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  doneBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
