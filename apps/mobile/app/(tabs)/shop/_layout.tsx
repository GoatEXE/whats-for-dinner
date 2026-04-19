import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useTheme';

export default function ShopLayout() {
  const c = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Shop' }} />
      <Stack.Screen
        name="suggestions"
        options={{ title: 'What Can I Make?' }}
      />
    </Stack>
  );
}
