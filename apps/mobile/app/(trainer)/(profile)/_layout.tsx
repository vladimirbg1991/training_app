import { Colors } from '@/constants/colors';
import { Stack } from 'expo-router';

export default function TrainerProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.page },
      }}
    />
  );
}
