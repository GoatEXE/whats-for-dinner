import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DatabaseProvider, useDatabase } from "@/hooks/useDatabase";
import { colors, spacing, fontSizes, radii } from "@/ui/theme";

function DatabaseGate({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useDatabase();

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="warning-outline" size={36} color={colors.error} />
        </View>
        <Text style={styles.title}>Storage unavailable</Text>
        <Text style={styles.body}>
          We couldn’t open the local recipe database on this device. If you’re
          previewing in a browser, note that the web build currently needs
          additional setup for SQLite — try the native build for full features.
        </Text>
        <Text style={styles.detail}>{error.message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loading}>Loading your kitchen…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="auto" />
      <DatabaseGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </DatabaseGate>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: spacing.lg,
  },
  detail: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 360,
    fontFamily: undefined,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  loading: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
