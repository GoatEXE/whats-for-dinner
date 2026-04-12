import { View, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/ui/theme';

function MealsHeaderActions() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginRight: 4 }}>
      <Pressable
        onPress={() => router.push('/(tabs)/meals/url-import')}
        hitSlop={8}
        accessibilityLabel="Import recipe from URL"
        accessibilityRole="button"
      >
        <Ionicons name="link-outline" size={24} color={colors.accent} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/(tabs)/meals/import')}
        hitSlop={8}
        accessibilityLabel="Import recipes from file"
        accessibilityRole="button"
      >
        <Ionicons name="cloud-download-outline" size={24} color={colors.accent} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/(tabs)/meals/settings')}
        hitSlop={8}
        accessibilityLabel="Meals settings"
        accessibilityRole="button"
      >
        <Ionicons name="settings-outline" size={24} color={colors.accent} />
      </Pressable>
    </View>
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
          headerRight: () => <MealsHeaderActions />,
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
        name="url-import"
        options={{ title: 'Import from URL', presentation: 'modal' }}
      />
      <Stack.Screen
        name="import"
        options={{ title: 'Import Recipes', presentation: 'modal' }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: 'Meals Settings', presentation: 'modal' }}
      />
    </Stack>
  );
}
