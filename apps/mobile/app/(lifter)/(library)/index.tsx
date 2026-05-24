import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ExerciseLibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 5
        </Text>
        <Text className="text-primary text-title mb-2">
          Exercise Library
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Browse and search the full exercise catalog. Filter by muscle group,
          equipment, or movement pattern.
        </Text>

        {/* Example exercise cards linking to detail */}
        <Link href="/(lifter)/(library)/bench-press" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Bench Press</Text>
            <Text className="text-label text-body-sm">
              Screen 6 — Exercise detail with demo video
            </Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(library)/barbell-squat" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Barbell Squat</Text>
            <Text className="text-label text-body-sm">
              Screen 6 — Exercise detail with demo video
            </Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(library)/deadlift" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Deadlift</Text>
            <Text className="text-label text-body-sm">
              Screen 6 — Exercise detail with demo video
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
