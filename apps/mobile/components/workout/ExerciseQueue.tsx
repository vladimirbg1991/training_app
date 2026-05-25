import { View, Text, Pressable } from 'react-native';

interface QueuedExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
}

interface ExerciseQueueProps {
  exercises: QueuedExercise[];
  startIndex: number;
  onPress?: (index: number) => void;
}

export function ExerciseQueue({ exercises, startIndex, onPress }: ExerciseQueueProps) {
  return (
    <View>
      {exercises.map((exercise, i) => {
        const displayNumber = startIndex + i;
        return (
          <Pressable
            key={exercise.exerciseId}
            onPress={() => onPress?.(i)}
            className="flex-row items-center bg-card rounded-btn-sm min-h-tap px-3 mb-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Exercise ${displayNumber}: ${exercise.exerciseName}, ${exercise.targetSets} sets of ${exercise.targetReps} reps`}
          >
            {/* Numbered badge */}
            <View className="w-[26px] h-[26px] bg-stat-tile rounded-[8px] items-center justify-center mr-3">
              <Text className="text-ambient text-[11px]">{displayNumber}</Text>
            </View>

            {/* Exercise name */}
            <Text className="text-primary text-body-sm flex-1" numberOfLines={1}>
              {exercise.exerciseName}
            </Text>

            {/* Target sets x reps */}
            <Text className="text-label text-body-sm ml-2">
              {exercise.targetSets} &times; {exercise.targetReps}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
