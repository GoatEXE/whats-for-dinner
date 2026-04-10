import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function ShopLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Shop' }} />
      <Stack.Screen
        name="suggestions"
        options={{ title: 'Suggestions' }}
      />
    </Stack>
  );
}
