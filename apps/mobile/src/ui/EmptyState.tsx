import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, fontSizes, radii } from './theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  icon?: IoniconsName;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
}

interface EmptyStateProps {
  icon?: IoniconsName;
  title: string;
  subtitle?: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actions,
}: EmptyStateProps) {
  const c = useColors();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: c.accentLight }]}>
        <Ionicons name={icon} size={44} color={c.accent} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => {
            const isPrimary = (action.variant ?? 'primary') === 'primary';
            return (
              <Pressable
                key={i}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel ?? action.label}
                style={({ pressed }) => [
                  styles.actionBtn,
                  isPrimary
                    ? { backgroundColor: c.accent }
                    : { backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent },
                  pressed && styles.pressed,
                ]}
              >
                {action.icon && (
                  <Ionicons
                    name={action.icon}
                    size={18}
                    color={isPrimary ? '#FFFFFF' : c.accent}
                  />
                )}
                <Text
                  style={[
                    styles.actionText,
                    { color: isPrimary ? '#FFFFFF' : c.accent },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
