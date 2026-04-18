import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useTheme';

export default function PlanLayout() {
  const c = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Weekly Plan' }} />
      <Stack.Screen name="history" options={{ title: 'Plan History' }} />
    </Stack>
  );
}
