import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes } from './theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IoniconsName;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
