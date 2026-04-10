import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fontSizes } from './theme';
import { TagChip } from './TagChip';

interface MealCardProps {
  name: string;
  tags: string[];
  isFavorite: boolean;
  ingredientCount: number;
  prepMinutes?: number | null;
  onPress?: () => void;
}

export function MealCard({
  name,
  tags,
  isFavorite,
  ingredientCount,
  prepMinutes,
  onPress,
}: MealCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}${isFavorite ? ', favorite' : ''}`}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {isFavorite && (
          <Ionicons name="star" size={16} color={colors.star} />
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{ingredientCount} ingredients</Text>
        {prepMinutes != null && (
          <Text style={styles.metaText}> · {prepMinutes} min</Text>
        )}
      </View>
      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
