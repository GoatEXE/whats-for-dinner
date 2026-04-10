import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/ui/theme';

function ImportHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/meals/import')}
      hitSlop={8}
      accessibilityLabel="Import recipes"
      accessibilityRole="button"
      style={{ marginRight: 4 }}
    >
      <Ionicons name="cloud-download-outline" size={24} color={colors.accent} />
    </Pressable>
  );
}

export default function MealsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Meals',
          headerRight: () => <ImportHeaderButton />,
        }}
      />
      <Stack.Screen
        name="[mealId]"
        options={{ title: 'Meal Details' }}
      />
      <Stack.Screen
        name="edit"
        options={{ title: 'Edit Meal', presentation: 'modal' }}
      />
      <Stack.Screen
        name="import"
        options={{ title: 'Import Recipes', presentation: 'modal' }}
      />
    </Stack>
  );
}
