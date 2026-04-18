import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAndroidShareIntentRouter } from "@/features/share-intent/useAndroidShareIntentRouter";
import { DatabaseProvider, useDatabase } from "@/hooks/useDatabase";
import { ThemeProvider, useTheme, useColors } from "@/hooks/useTheme";
import { buildNavigationTheme } from "@/ui/navigation-theme";
import { spacing, fontSizes, radii } from "@/ui/theme";

function AppNavigator() {
  useAndroidShareIntentRouter();
  const { scheme, colors: palette } = useTheme();
  const navTheme = buildNavigationTheme(scheme, palette);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </NavigationThemeProvider>
  );
}

function DatabaseGate({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useDatabase();
  const c = useColors();

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: c.dangerLight }]}>
          <Ionicons name="warning-outline" size={36} color={c.error} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Storage unavailable</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          We couldn't open the local recipe database on this device. If you're
          previewing in a browser, note that the web build currently needs
          additional setup for SQLite — try the native build for full features.
        </Text>
        <Text style={[styles.detail, { color: c.textMuted, backgroundColor: c.surface }]}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.accent} />
        <Text style={[styles.loading, { color: c.textSecondary }]}>Loading your kitchen…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <DatabaseGate>
          <AppNavigator />
        </DatabaseGate>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    fontSize: fontSizes.md,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: spacing.lg,
  },
  detail: {
    fontSize: fontSizes.xs,
    textAlign: "center",
    maxWidth: 360,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  loading: {
    fontSize: fontSizes.md,
    marginTop: spacing.md,
  },
});
