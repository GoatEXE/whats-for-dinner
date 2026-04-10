import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from './SearchBar';
import { colors, spacing, radii, fontSizes } from './theme';
import type { Meal } from '../types';
import { normalizeName } from '@whats-for-dinner/domain';

interface MealPickerModalProps {
  visible: boolean;
  meals: Meal[];
  onSelect: (meal: Meal) => void;
  onClose: () => void;
}

export function MealPickerModal({
  visible,
  meals,
  onSelect,
  onClose,
}: MealPickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const active = meals.filter((m) => !m.isArchived);

    // Sort favorites first
    const sorted = [...active].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    if (!search.trim()) return sorted;
    const q = normalizeName(search);
    return sorted.filter((m) => normalizeName(m.name).includes(q));
  }, [meals, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose a Meal</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search meals…" />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onSelect(item);
                setSearch('');
              }}
              accessibilityRole="button"
            >
              <View style={styles.rowContent}>
                <Text style={styles.mealName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.tags.length > 0 && (
                  <Text style={styles.mealMeta} numberOfLines={1}>
                    {item.tags.join(', ')}
                  </Text>
                )}
              </View>
              {item.isFavorite && (
                <Ionicons name="star" size={16} color={colors.star} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? 'No meals match your search' : 'No meals available'}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    minHeight: 52,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  mealName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  mealMeta: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
});
