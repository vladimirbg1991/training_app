import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/colors';

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: '\u{1F3E0}',
    clients: '\u{1F465}',
    programs: '\u{1F4CB}',
    messages: '\u{1F4AC}',
    profile: '\u{1F464}',
  };
  return <Text style={{ fontSize: 18, color }}>{icons[name] ?? '\u2022'}</Text>;
}

export default function TrainerLayout() {
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
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(clients)"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color }) => <TabIcon name="clients" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(programs)"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color }) => <TabIcon name="programs" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(messages)"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <TabIcon name="messages" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}
