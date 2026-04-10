import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/ui/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons
              name={'calendar-outline' as IoniconsName}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons
              name={'cart-outline' as IoniconsName}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons
              name={'restaurant-outline' as IoniconsName}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
