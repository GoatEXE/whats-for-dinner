import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function MealsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Meals' }} />
      <Stack.Screen
        name="[mealId]"
        options={{ title: 'Meal Details' }}
      />
      <Stack.Screen
        name="edit"
        options={{ title: 'Edit Meal', presentation: 'modal' }}
      />
    </Stack>
  );
}
