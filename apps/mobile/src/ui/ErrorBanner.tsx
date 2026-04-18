import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useTheme';
import { spacing, radii, fontSizes } from './theme';

interface ErrorBannerProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  tone?: 'error' | 'warning';
}

/**
 * Dismissable, accessible banner for surfacing errors or warnings in a
 * friendly, non-blocking way. Prefer this over Alert for recoverable issues.
 */
export function ErrorBanner({
  message,
  title,
  onDismiss,
  tone = 'error',
}: ErrorBannerProps) {
  const c = useColors();
  const accent = tone === 'warning' ? c.warning : c.error;
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: accent + '10',
          borderColor: accent + '40',
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={tone === 'warning' ? 'warning-outline' : 'alert-circle-outline'}
        size={20}
        color={accent}
        style={styles.icon}
      />
      <View style={styles.content}>
        {title && (
          <Text style={[styles.title, { color: accent }]}>{title}</Text>
        )}
        <Text style={[styles.message, { color: accent }]}>{message}</Text>
      </View>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={18} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  dismissBtn: {
    padding: 2,
  },
});
