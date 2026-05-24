import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 6
        </Text>
        <Text className="text-primary text-title mb-2">
          Exercise Detail
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Viewing exercise: {exerciseId}
        </Text>

        {/* Placeholder sections */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Demo Video</Text>
          <Text className="text-ambient text-body-sm">
            Mux adaptive streaming player placeholder
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Muscle Groups</Text>
          <Text className="text-ambient text-body-sm">
            Primary and secondary muscle group chips
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Instructions</Text>
          <Text className="text-ambient text-body-sm">
            Step-by-step exercise instructions from catalog
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Personal History</Text>
          <Text className="text-ambient text-body-sm">
            Your recent sets and PR for this exercise
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
