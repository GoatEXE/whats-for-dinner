import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes } from './theme';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
}

export function TagChip({ label, onRemove }: TagChipProps) {
  const c = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: c.accentLight }]}>
      <Text style={[styles.label, { color: c.accent }]}>{label}</Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityLabel={`Remove tag ${label}`}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={14} color={c.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
});
