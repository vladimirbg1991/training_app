import { View, Text, Pressable } from 'react-native';
import { RestTimerRing } from './RestTimerRing';

interface RestTimerInlineProps {
  progress: number;
  timeLabel: string;
  targetLabel: string;
  onSkip: () => void;
}

export function RestTimerInline({
  progress,
  timeLabel,
  targetLabel,
  onSkip,
}: RestTimerInlineProps) {
  return (
    <View className="flex-row items-center bg-card rounded-card p-card-pad mb-2">
      {/* Timer ring */}
      <View className="mr-3">
        <RestTimerRing size={48} progress={progress} timeLabel={timeLabel} />
      </View>

      {/* Labels */}
      <View className="flex-1 mr-2">
        <Text className="text-primary text-subtitle font-medium">{timeLabel}</Text>
        <Text className="text-label text-body-sm" numberOfLines={2}>
          {targetLabel}
        </Text>
      </View>

      {/* Skip button */}
      <Pressable
        onPress={onSkip}
        className="h-8 px-3 bg-stat-tile rounded-btn-sm items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Skip rest timer"
      >
        <Text className="text-ambient text-body-sm">Skip</Text>
      </Pressable>
    </View>
  );
}
