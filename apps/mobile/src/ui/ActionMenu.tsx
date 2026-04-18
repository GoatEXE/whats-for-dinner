import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  type LayoutRectangle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes, touchTargetMin } from './theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: IoniconsName;
  onPress: () => void;
}

interface ActionMenuProps {
  /** Items to display in the dropdown. */
  items: ActionMenuItem[];
  /** Icon for the trigger button. */
  triggerIcon?: IoniconsName;
  /** Accessibility label for the trigger. */
  accessibilityLabel?: string;
}

/**
 * A simple dropdown action menu triggered by a header icon.
 * Opens a transparent modal with a positioned card below the trigger.
 */
export function ActionMenu({
  items,
  triggerIcon = 'ellipsis-horizontal',
  accessibilityLabel = 'More actions',
}: ActionMenuProps) {
  const c = useColors();
  const [visible, setVisible] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setVisible(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const handleItemPress = useCallback((onPress: () => void) => {
    setVisible(false);
    // Small delay to let the modal close before navigation
    setTimeout(onPress, 100);
  }, []);

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={styles.trigger}
      >
        <Ionicons name={triggerIcon} size={24} color={c.accent} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View
            style={[
              styles.menu,
              { backgroundColor: c.surface, borderColor: c.surfaceBorder },
              triggerLayout && {
                // Align the menu's top-right corner beneath the trigger
                position: 'absolute',
                top: triggerLayout.y + triggerLayout.height + 4,
                right: 8,
              },
            ]}
          >
            {items.map((item, idx) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.menuItem,
                  idx < items.length - 1 && [styles.menuItemBorder, { borderBottomColor: c.surfaceBorder }],
                  pressed && { backgroundColor: c.background },
                ]}
                onPress={() => handleItemPress(item.onPress)}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={20} color={c.text} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: touchTargetMin,
    minHeight: touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    borderRadius: radii.lg,
    borderWidth: 1,
    minWidth: 200,
    // Elevation / shadow
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: touchTargetMin,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
});
