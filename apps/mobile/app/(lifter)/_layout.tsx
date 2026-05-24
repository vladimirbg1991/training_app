import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@/constants/colors';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        color: focused ? Colors.accent : Colors.label,
        marginTop: 2,
      }}
    >
      {symbol}
    </Text>
  );
}

export default function LifterLayout() {
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
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol={'\u2302'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(library)"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol={'\u{1F4D6}'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(workout)"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol={'\u{1F3CB}'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(progress)"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol={'\u{1F4C8}'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol={'\u{1F464}'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
