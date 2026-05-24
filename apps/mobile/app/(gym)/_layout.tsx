import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/colors';

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    dashboard: '\u{1F4CA}',
    equipment: '\u{1F3CB}\uFE0F',
    members: '\u{1F465}',
    insights: '\u{1F4C8}',
    settings: '\u2699\uFE0F',
  };
  return <Text style={{ fontSize: 18, color }}>{icons[name] ?? '\u2022'}</Text>;
}

export default function GymLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.page,
          borderTopColor: Colors.borderSubtle,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.label,
        tabBarLabelStyle: { fontSize: 9 },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <TabIcon name="dashboard" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(equipment)"
        options={{
          title: 'Equipment',
          tabBarIcon: ({ color }) => (
            <TabIcon name="equipment" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(members)"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <TabIcon name="members" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(insights)"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <TabIcon name="insights" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
