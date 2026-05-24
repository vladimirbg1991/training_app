import { Colors } from '@/constants/colors';
import { Stack } from 'expo-router';

export default function LibraryStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.page },
      }}
    />
  );
}
