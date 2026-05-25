import { Tabs } from 'expo-router';
import {
  IconHome,
  IconBook2,
  IconBarbell,
  IconChartLine,
  IconUser,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

export default function LifterLayout(): React.JSX.Element {
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
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '400',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          unmountOnBlur: false,
          tabBarIcon: ({ color }) => <IconHome size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(library)"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <IconBook2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(workout)"
        options={{
          title: 'Workout',
          unmountOnBlur: false,
          tabBarIcon: ({ color }) => <IconBarbell size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(progress)"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <IconChartLine size={22} color={color} />,
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
