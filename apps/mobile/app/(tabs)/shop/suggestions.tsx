import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { usePantry } from '@/hooks/usePantry';
import { useSuggestions } from '@/features/suggestions/useSuggestions';
import { EmptyState } from '@/ui/EmptyState';
import { TagChip } from '@/ui/TagChip';
import { colors, spacing, radii, fontSizes } from '@/ui/theme';

export default function SuggestionsScreen() {
  const router = useRouter();
  const { meals } = useMeals();
  const { items: pantryItems } = usePantry();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [includePartial, setIncludePartial] = useState(true);

  const { matches } = useSuggestions(meals, pantryItems, {
    favoritesOnly,
    includePartial,
  });

  const handleMealPress = (id: number) => {
    // Domain IDs are numbers; we navigate with string
    router.push(`/(tabs)/meals/${id}`);
  };

  return (
    <View style={styles.container}>
      {/* Filter toggles */}
      <View style={styles.filters}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Favorites only</Text>
          <Switch
            value={favoritesOnly}
            onValueChange={setFavoritesOnly}
            trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Include partial</Text>
          <Switch
            value={includePartial}
            onValueChange={setIncludePartial}
            trackColor={{ true: colors.accent, false: colors.surfaceBorder }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pct = Math.round(item.matchPercentage * 100);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleMealPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${pct}% match`}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isFavorite && (
                    <Ionicons name="star" size={14} color={colors.star} />
                  )}
                </View>
                <View style={[styles.matchBadge, item.isFullMatch && styles.fullMatchBadge]}>
                  <Text
                    style={[
                      styles.matchBadgeText,
                      item.isFullMatch && styles.fullMatchText,
                    ]}
                  >
                    {pct}%
                  </Text>
                </View>
              </View>

              {/* Match bar */}
              <View style={styles.matchBarBg}>
                <View
                  style={[
                    styles.matchBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: item.isFullMatch
                        ? colors.success
                        : colors.accent,
                    },
                  ]}
                />
              </View>

              {/* Missing ingredients */}
              {item.missingRequiredIngredients.length > 0 && (
                <View style={styles.missingSection}>
                  <Text style={styles.missingLabel}>
                    Missing ({item.missingRequiredIngredients.length}):
                  </Text>
                  <Text style={styles.missingList} numberOfLines={2}>
                    {item.missingRequiredIngredients.map((i) => i.name).join(', ')}
                  </Text>
                </View>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <View style={styles.tags}>
                  {item.tags.map((tag) => (
                    <TagChip key={tag} label={tag} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="bulb-outline"
            title={
              pantryItems.length === 0
                ? 'Add pantry items first'
                : 'No matches found'
            }
            subtitle={
              pantryItems.length === 0
                ? 'Go to the Shop tab and add ingredients you have on hand.'
                : 'Try adding more pantry items or adjusting filters.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.xl,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  cardName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
  },
  fullMatchBadge: {
    backgroundColor: colors.successLight,
  },
  matchBadgeText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  fullMatchText: {
    color: colors.success,
  },
  matchBarBg: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: 4,
    borderRadius: 2,
  },
  missingSection: {
    marginTop: spacing.md,
  },
  missingLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  missingList: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
