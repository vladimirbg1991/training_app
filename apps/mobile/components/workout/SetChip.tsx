import { View, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { IconTrophy } from '@tabler/icons-react-native';

interface SetChipProps {
  weight: number | null;
  unit: string;
  reps: number | null;
  isPersonalRecord?: boolean;
  isWarmup?: boolean;
}

export function SetChip({
  weight,
  unit,
  reps,
  isPersonalRecord = false,
  isWarmup = false,
}: SetChipProps) {
  const weightDisplay = weight !== null ? String(weight) : '\u2014';
  const repsDisplay = reps !== null ? String(reps) : '\u2014';
  const label = `${weightDisplay}\u00D7${repsDisplay}`;

  return (
    <View
      className={`flex-row items-center bg-stat-tile rounded-pill px-2 py-0.5 ${
        isPersonalRecord ? 'border-[1px] border-amber' : ''
      }`}
      accessibilityLabel={`${isWarmup ? 'Warmup set' : 'Set'}: ${weight ?? 0} ${unit} for ${reps ?? 0} reps${isPersonalRecord ? ', personal record' : ''}`}
    >
      {isWarmup && (
        <Text className="text-label text-[9px] mr-0.5">W </Text>
      )}
      <Text className="text-ambient text-[9px]">{label}</Text>
      {isPersonalRecord && (
        <View className="ml-0.5">
          <IconTrophy size={9} color={Colors.amber} />
        </View>
      )}
    </View>
  );
}
