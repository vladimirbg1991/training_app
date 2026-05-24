import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function PersonalRecordsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 23
        </Text>
        <Text className="text-primary text-title mb-2">
          Personal Records
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          All your PRs in one place. Estimated 1RM, top set, best volume
          session, and longest streak.
        </Text>

        {/* PR cards placeholder */}
        {[
          { exercise: 'Bench Press', pr: '100kg', type: 'Est. 1RM', date: 'May 20' },
          { exercise: 'Squat', pr: '140kg', type: 'Est. 1RM', date: 'May 18' },
          { exercise: 'Deadlift', pr: '180kg', type: 'Est. 1RM', date: 'May 15' },
          { exercise: 'OHP', pr: '65kg', type: 'Est. 1RM', date: 'May 12' },
        ].map((record) => (
          <View key={record.exercise} className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center">
            <View className="flex-1">
              <Text className="text-primary text-subtitle">{record.exercise}</Text>
              <Text className="text-ambient text-body-sm">{record.type} — {record.date}</Text>
            </View>
            <View className="bg-stat-tile rounded-pill px-3 py-1.5">
              <Text className="text-primary text-subtitle">{record.pr}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
