import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { colors, spacing, radii, fontSizes } from './theme';

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
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
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
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
  cancelButton: {
    backgroundColor: colors.surface,
  },
  confirmButton: {
    backgroundColor: colors.accent,
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  cancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.white,
  },
});
