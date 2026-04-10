import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { DatabaseProvider } from "@/hooks/useDatabase";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DatabaseProvider>
  );
}
