import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes } from './theme';
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
  const c = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.surfaceBorder },
        pressed && { backgroundColor: c.background },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}${isFavorite ? ', favorite' : ''}`}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {name}
        </Text>
        {isFavorite && (
          <Ionicons name="star" size={16} color={c.star} />
        )}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: c.textSecondary }]}>{ingredientCount} ingredients</Text>
        {prepMinutes != null && (
          <Text style={[styles.metaText, { color: c.textSecondary }]}> · {prepMinutes} min</Text>
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
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSizes.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
