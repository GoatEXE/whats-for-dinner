import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from './theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface FABProps {
  icon?: IoniconsName;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function FAB({ icon = 'add', onPress, accessibilityLabel = 'Add' }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabPressed: {
    backgroundColor: colors.accentDark,
  },
});
