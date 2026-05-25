import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { IconCircleCheckFilled } from '@tabler/icons-react-native';
import { SetChip } from './SetChip';

interface CompletedSet {
  weight: number | null;
  unit: string;
  reps: number | null;
  isPersonalRecord?: boolean;
}

interface CompletedExerciseProps {
  exerciseName: string;
  sets: CompletedSet[];
  discardedSetLabel?: string;
  onUndo?: () => void;
}

export function CompletedExercise({
  exerciseName,
  sets,
  discardedSetLabel,
  onUndo,
}: CompletedExerciseProps) {
  return (
    <View className="bg-card rounded-card p-3 mb-2 opacity-[0.85]">
      {/* Main row */}
      <View className="flex-row items-center">
        {/* Check icon */}
        <View className="mr-2.5">
          <IconCircleCheckFilled size={20} color={Colors.accent} />
        </View>

        {/* Exercise name */}
        <Text className="text-primary text-body-sm flex-1 mr-2" numberOfLines={1}>
          {exerciseName}
        </Text>

        {/* Set chips */}
        <View className="flex-row flex-wrap gap-1 flex-shrink-0">
          {sets.map((set, i) => (
            <SetChip
              key={i}
              weight={set.weight}
              unit={set.unit}
              reps={set.reps}
              isPersonalRecord={set.isPersonalRecord}
            />
          ))}
        </View>
      </View>

      {/* Discarded set bar */}
      {discardedSetLabel && (
        <View className="flex-row items-center bg-amber-bg rounded-btn-sm px-2.5 py-1.5 mt-2">
          <Text className="text-amber text-body-sm flex-1">{discardedSetLabel}</Text>
          {onUndo && (
            <Pressable
              onPress={onUndo}
              accessibilityRole="button"
              accessibilityLabel="Undo discard"
            >
              <Text className="text-amber text-subtitle underline">undo</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
