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
import { useColors } from '@/hooks/useTheme';
import { EmptyState } from '@/ui/EmptyState';
import { TagChip } from '@/ui/TagChip';
import { spacing, radii, fontSizes } from '@/ui/theme';

export default function SuggestionsScreen() {
  const router = useRouter();
  const c = useColors();
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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Filter toggles */}
      <View style={[styles.filters, { backgroundColor: c.surface, borderBottomColor: c.surfaceBorder }]}>
        <View style={styles.filterItem}>
          <Text style={[styles.filterLabel, { color: c.textSecondary }]}>Favorites only</Text>
          <Switch
            value={favoritesOnly}
            onValueChange={setFavoritesOnly}
            trackColor={{ true: c.accent, false: c.surfaceBorder }}
            thumbColor={c.white}
          />
        </View>
        <View style={styles.filterItem}>
          <Text style={[styles.filterLabel, { color: c.textSecondary }]}>Include partial</Text>
          <Switch
            value={includePartial}
            onValueChange={setIncludePartial}
            trackColor={{ true: c.accent, false: c.surfaceBorder }}
            thumbColor={c.white}
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
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, borderColor: c.surfaceBorder },
                pressed && { backgroundColor: c.background },
              ]}
              onPress={() => handleMealPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${pct}% match`}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isFavorite && (
                    <Ionicons name="star" size={14} color={c.star} />
                  )}
                </View>
                <View style={[
                  styles.matchBadge,
                  { backgroundColor: c.accentLight },
                  item.isFullMatch && { backgroundColor: c.successLight },
                ]}>
                  <Text
                    style={[
                      styles.matchBadgeText,
                      { color: c.accent },
                      item.isFullMatch && { color: c.success },
                    ]}
                  >
                    {pct}%
                  </Text>
                </View>
              </View>

              {/* Match bar */}
              <View style={[styles.matchBarBg, { backgroundColor: c.surfaceBorder }]}>
                <View
                  style={[
                    styles.matchBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: item.isFullMatch
                        ? c.success
                        : c.accent,
                    },
                  ]}
                />
              </View>

              {/* Missing ingredients */}
              {item.missingRequiredIngredients.length > 0 && (
                <View style={styles.missingSection}>
                  <Text style={[styles.missingLabel, { color: c.textSecondary }]}>
                    Missing ({item.missingRequiredIngredients.length}):
                  </Text>
                  <Text style={[styles.missingList, { color: c.textMuted }]} numberOfLines={2}>
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
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.xl,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSizes.sm,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  matchBadgeText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  matchBarBg: {
    height: 4,
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
  },
  missingList: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
