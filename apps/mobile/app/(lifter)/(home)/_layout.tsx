import { Colors } from '@/constants/colors';
import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.page },
      }}
    />
  );
}
