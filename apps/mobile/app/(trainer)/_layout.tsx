import { Tabs } from 'expo-router';
import {
  IconHome,
  IconUsers,
  IconClipboardList,
  IconMessage,
  IconUser,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

export default function TrainerLayout(): React.JSX.Element {
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
          tabBarIcon: ({ color }) => <IconHome size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(clients)"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color }) => <IconUsers size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(programs)"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color }) => <IconClipboardList size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(messages)"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconMessage size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconUser size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
