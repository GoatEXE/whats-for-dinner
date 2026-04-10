import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fontSizes } from './theme';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
}

export function TagChip({ label, onRemove }: TagChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityLabel={`Remove tag ${label}`}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={14} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.accent,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
});
