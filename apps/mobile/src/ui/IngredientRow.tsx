import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from './theme';

interface IngredientRowProps {
  name: string;
  quantityText?: string | null;
  isOptional?: boolean;
}

export function IngredientRow({ name, quantityText, isOptional }: IngredientRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.bullet}>•</Text>
      <View style={styles.content}>
        <Text style={styles.name}>
          {name}
          {isOptional && <Text style={styles.optional}> (optional)</Text>}
        </Text>
        {quantityText ? <Text style={styles.quantity}>{quantityText}</Text> : null}
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
    color: colors.accent,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  optional: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  quantity: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
