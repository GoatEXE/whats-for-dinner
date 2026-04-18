import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes } from './theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const c = useColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: c.surface }]} onPress={() => {}}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: c.background }]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: destructive ? c.danger : c.accent },
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  dialog: {
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.md,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
