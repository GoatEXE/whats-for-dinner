import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { spacing, fontSizes } from './theme';

interface IngredientRowProps {
  name: string;
  quantityText?: string | null;
  isOptional?: boolean;
}

export function IngredientRow({ name, quantityText, isOptional }: IngredientRowProps) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.bullet, { color: c.accent }]}>•</Text>
      <View style={styles.content}>
        <Text style={[styles.name, { color: c.text }]}>
          {name}
          {isOptional && <Text style={[styles.optional, { color: c.textMuted }]}> (optional)</Text>}
        </Text>
        {quantityText ? <Text style={[styles.quantity, { color: c.textSecondary }]}>{quantityText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  bullet: {
    fontSize: fontSizes.md,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.md,
  },
  optional: {
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
  },
  quantity: {
    fontSize: fontSizes.sm,
    marginTop: 1,
  },
});
