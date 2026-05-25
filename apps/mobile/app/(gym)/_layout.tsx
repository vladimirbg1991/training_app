import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard,
  IconBarbell,
  IconUsers,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

export default function GymLayout(): React.JSX.Element {
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
          tabBarIcon: ({ color }) => <IconLayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(equipment)"
        options={{
          title: 'Equipment',
          tabBarIcon: ({ color }) => <IconBarbell size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(members)"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <IconUsers size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(insights)"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <IconChartBar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSettings size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
