import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes } from './theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…' }: SearchBarProps) {
  const c = useColors();
  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
      <Ionicons name="search" size={18} color={c.textMuted} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: c.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={18} color={c.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    paddingVertical: 0,
  },
  clearBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
