import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function PlanLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Weekly Plan' }} />
      <Stack.Screen name="history" options={{ title: 'Plan History' }} />
    </Stack>
  );
}
