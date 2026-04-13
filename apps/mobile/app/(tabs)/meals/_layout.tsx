import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ActionMenu, type ActionMenuItem } from '@/ui/ActionMenu';
import { useColors } from '@/hooks/useTheme';

function MealsHeaderActions() {
  const router = useRouter();

  const menuItems: ActionMenuItem[] = [
    {
      key: 'url-import',
      label: 'Import from URL',
      icon: 'link-outline',
      onPress: () => router.push('/(tabs)/meals/url-import'),
    },
    {
      key: 'file-import',
      label: 'Import from File',
      icon: 'cloud-download-outline',
      onPress: () => router.push('/(tabs)/meals/import'),
    },
    {
      key: 'export',
      label: 'Export Cookbook',
      icon: 'share-outline',
      onPress: () => router.push('/(tabs)/meals/export'),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: 'settings-outline',
      onPress: () => router.push('/(tabs)/meals/settings'),
    },
  ];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
      <ActionMenu
        items={menuItems}
        triggerIcon="ellipsis-horizontal"
        accessibilityLabel="Meals actions menu"
      />
    </View>
  );
}

export default function MealsLayout() {
  const c = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
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
        name="export"
        options={{ title: 'Export Cookbook', presentation: 'modal' }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: 'Meals Settings', presentation: 'modal' }}
      />
    </Stack>
  );
}
