import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface RestTimerRingProps {
  size: number;
  progress: number;
  timeLabel: string;
  showLabel?: boolean;
  trackColor?: string;
  fillColor?: string;
}

export function RestTimerRing({
  size,
  progress,
  timeLabel,
  showLabel = false,
  trackColor = Colors.statTile,
  fillColor = Colors.label,
}: RestTimerRingProps) {
  const isCompact = size <= 64;
  const strokeWidth = isCompact ? 3 : 4;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clampedProgress);

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      {/* Center labels */}
      <View className="absolute items-center justify-center">
        {showLabel && !isCompact && (
          <Text className="text-label text-label-xs uppercase tracking-widest">
            REST
          </Text>
        )}
        <Text
          className={
            isCompact
              ? 'text-primary text-[11px] font-medium'
              : 'text-primary text-hero-num font-medium'
          }
        >
          {timeLabel}
        </Text>
      </View>
    </View>
  );
}
