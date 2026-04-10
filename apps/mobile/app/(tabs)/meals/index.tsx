import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/hooks/useMeals';
import { SearchBar } from '@/ui/SearchBar';
import { MealCard } from '@/ui/MealCard';
import { EmptyState } from '@/ui/EmptyState';
import { FAB } from '@/ui/FAB';
import { colors, spacing, fontSizes, radii } from '@/ui/theme';
import { normalizeName } from '@whats-for-dinner/domain';
import type { MealRecord } from '@/db/types';

type FilterMode = 'all' | 'favorites' | 'archived';

export default function MealsScreen() {
  const router = useRouter();
  const { meals, loading, refresh } = useMeals();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const filteredMeals = useMemo(() => {
    let list = meals;

    // Filter by mode
    if (filter === 'favorites') {
      list = list.filter((m) => m.isFavorite);
    } else if (filter === 'archived') {
      list = list.filter((m) => m.isArchived);
    } else {
      list = list.filter((m) => !m.isArchived);
    }

    // Search
    if (search.trim()) {
      const q = normalizeName(search);
      list = list.filter((m) => {
        const nameMatch = normalizeName(m.name).includes(q);
        const tagMatch = m.tags.some((t) => normalizeName(t).includes(q));
        const ingredientMatch = m.ingredients.some((i) =>
          normalizeName(i.name).includes(q),
        );
        return nameMatch || tagMatch || ingredientMatch;
      });
    }

    return list;
  }, [meals, search, filter]);

  const handleMealPress = useCallback(
    (id: string) => {
      router.push(`/(tabs)/meals/${id}`);
    },
    [router],
  );

  const handleAddMeal = useCallback(() => {
    router.push('/(tabs)/meals/edit');
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search meals, tags, ingredients…"
        />
        <View style={styles.filterRow}>
          {(['all', 'favorites', 'archived'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.filterBtn, filter === mode && styles.filterBtnActive]}
              onPress={() => setFilter(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === mode }}
            >
              {mode === 'favorites' && (
                <Ionicons
                  name="star"
                  size={13}
                  color={filter === mode ? colors.white : colors.star}
                  style={styles.filterIcon}
                />
              )}
              <Text
                style={[
                  styles.filterText,
                  filter === mode && styles.filterTextActive,
                ]}
              >
                {mode === 'all' ? 'All' : mode === 'favorites' ? 'Favorites' : 'Archived'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredMeals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => refresh()}
        renderItem={({ item }) => (
          <MealCard
            name={item.name}
            tags={item.tags}
            isFavorite={item.isFavorite}
            ingredientCount={item.ingredients.length}
            prepMinutes={item.prepMinutes}
            onPress={() => handleMealPress(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title={search ? 'No meals found' : 'No meals yet'}
            subtitle={search ? 'Try a different search' : 'Tap + to add your first meal'}
          />
        }
      />

      <FAB onPress={handleAddMeal} accessibilityLabel="Add new meal" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterIcon: {
    marginRight: spacing.xs,
  },
  filterText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 80, // space for FAB
  },
});
