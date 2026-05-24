import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: Colors.page },
      }}
    />
  );
}
