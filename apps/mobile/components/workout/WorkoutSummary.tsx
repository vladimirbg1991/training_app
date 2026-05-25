import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { IconCheck, IconTrophy } from '@tabler/icons-react-native';

interface DetectedPR {
  exerciseName: string;
  description: string;
}

interface WorkoutSummaryProps {
  totalVolume: number;
  totalSets: number;
  durationSeconds: number;
  avgRPE: number | null;
  detectedPRs: DetectedPR[];
  selectedEffort: number | null;
  onSelectEffort: (effort: number) => void;
  onSave: () => void;
  onAddNote: () => void;
  weightUnit: string;
}

const EFFORT_OPTIONS = [
  { value: 1, emoji: '\uD83D\uDE35', label: 'Exhausted' },
  { value: 2, emoji: '\uD83D\uDE10', label: 'Okay' },
  { value: 3, emoji: '\uD83D\uDCAA', label: 'Strong' },
  { value: 4, emoji: '\uD83D\uDD25', label: 'On fire' },
] as const;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatVolume(volume: number, unit: string): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k ${unit}`;
  }
  return `${volume.toLocaleString()} ${unit}`;
}

export function WorkoutSummary({
  totalVolume,
  totalSets,
  durationSeconds,
  avgRPE,
  detectedPRs,
  selectedEffort,
  onSelectEffort,
  onSave,
  onAddNote,
  weightUnit,
}: WorkoutSummaryProps) {
  return (
    <View className="px-4">
      {/* Hero check icon + title */}
      <View className="items-center mb-6">
        <View className="w-[56px] h-[56px] bg-hero rounded-2xl items-center justify-center mb-3">
          <IconCheck size={32} color={Colors.primary} />
        </View>
        <Text className="text-primary text-title font-medium mb-1">Workout complete</Text>
        <Text className="text-label text-body-sm">
          {formatDuration(durationSeconds)} &middot; {totalSets} sets
        </Text>
      </View>

      {/* PR badges */}
      {detectedPRs.length > 0 && (
        <View className="mb-4">
          {detectedPRs.map((pr, i) => (
            <View
              key={i}
              className="flex-row items-center bg-amber-bg rounded-card px-3 py-2.5 mb-1.5"
            >
              <IconTrophy size={18} color={Colors.amber} />
              <View className="ml-2.5 flex-1">
                <Text className="text-amber text-subtitle font-medium">{pr.exerciseName}</Text>
                <Text className="text-amber text-body-sm">{pr.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 2x2 stat grid */}
      <View className="flex-row flex-wrap gap-card-gap mb-6">
        <View className="flex-1 min-w-[45%] bg-stat-tile rounded-btn-sm p-3">
          <Text className="text-ambient text-label-xs uppercase tracking-widest mb-0.5">
            TOTAL VOLUME
          </Text>
          <Text className="text-primary text-subtitle font-medium">
            {formatVolume(totalVolume, weightUnit)}
          </Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-stat-tile rounded-btn-sm p-3">
          <Text className="text-ambient text-label-xs uppercase tracking-widest mb-0.5">
            SETS
          </Text>
          <Text className="text-primary text-subtitle font-medium">{totalSets}</Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-stat-tile rounded-btn-sm p-3">
          <Text className="text-ambient text-label-xs uppercase tracking-widest mb-0.5">
            DURATION
          </Text>
          <Text className="text-primary text-subtitle font-medium">
            {formatDuration(durationSeconds)}
          </Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-stat-tile rounded-btn-sm p-3">
          <Text className="text-ambient text-label-xs uppercase tracking-widest mb-0.5">
            AVG RPE
          </Text>
          <Text className="text-primary text-subtitle font-medium">
            {avgRPE !== null ? avgRPE.toFixed(1) : '\u2014'}
          </Text>
        </View>
      </View>

      {/* Effort selector */}
      <View className="mb-6">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-3 text-center">
          HOW DID IT FEEL?
        </Text>
        <View className="flex-row justify-center gap-3">
          {EFFORT_OPTIONS.map((option) => {
            const isSelected = selectedEffort === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSelectEffort(option.value)}
                className={`w-[60px] h-[60px] items-center justify-center rounded-btn ${
                  isSelected
                    ? 'bg-accent border-[1.5px] border-primary'
                    : 'bg-stat-tile'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Effort: ${option.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text className="text-[24px]">{option.emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Action buttons */}
      <Pressable
        onPress={onSave}
        className="bg-accent min-h-btn rounded-btn items-center justify-center mb-2"
        accessibilityRole="button"
        accessibilityLabel="Save workout"
      >
        <Text className="text-accent-text text-[14px] font-medium">Save workout</Text>
      </Pressable>
      <Pressable
        onPress={onAddNote}
        className="bg-card border border-border-subtle min-h-btn-sm rounded-btn items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Add note"
      >
        <Text className="text-ambient text-[13px]">Add note</Text>
      </Pressable>
    </View>
  );
}
