import { useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { IconMinus, IconPlus } from '@tabler/icons-react-native';

interface SteppedInputProps {
  label: string;
  value: number | null;
  unit: string;
  step: number;
  stepLabel?: string;
  onChange: (newValue: number) => void;
  minValue?: number;
  maxValue?: number;
}

export function SteppedInput({
  label,
  value,
  unit,
  step,
  stepLabel,
  onChange,
  minValue = 0,
  maxValue = 999,
}: SteppedInputProps) {
  const longPressActiveRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount (prevents leak if user navigates during long-press)
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const clamp = useCallback(
    (v: number) => Math.max(minValue, Math.min(maxValue, v)),
    [minValue, maxValue],
  );

  const increment = useCallback(
    (halfStep: boolean) => {
      const delta = halfStep ? step / 2 : step;
      const current = value ?? 0;
      const next = clamp(current + delta);
      onChange(next);
      void Haptics.selectionAsync();
    },
    [value, step, clamp, onChange],
  );

  const decrement = useCallback(
    (halfStep: boolean) => {
      const delta = halfStep ? step / 2 : step;
      const current = value ?? 0;
      const next = clamp(current - delta);
      onChange(next);
      void Haptics.selectionAsync();
    },
    [value, step, clamp, onChange],
  );

  const startLongPress = useCallback(
    (direction: 'inc' | 'dec') => {
      longPressActiveRef.current = true;
      const fn = direction === 'inc' ? increment : decrement;
      // First half-step fires immediately on long-press trigger
      fn(true);
      // Repeat at 150ms intervals
      intervalRef.current = setInterval(() => {
        if (!longPressActiveRef.current) return;
        fn(true);
      }, 150);
    },
    [increment, decrement],
  );

  const stopLongPress = useCallback(() => {
    longPressActiveRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const displayValue =
    value === null ? '\u2014' : Number.isInteger(value) ? String(value) : value.toFixed(1);

  const resolvedStepLabel = stepLabel ?? `step ${step} ${unit}`;

  return (
    <View className="items-center">
      {/* Label */}
      <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
        {label}
      </Text>

      {/* Input row */}
      <View className="flex-row items-center gap-4">
        {/* Decrement */}
        <Pressable
          onPress={() => decrement(false)}
          onLongPress={() => startLongPress('dec')}
          onPressOut={stopLongPress}
          delayLongPress={400}
          className="w-[44px] h-[44px] bg-hero rounded-btn-sm items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label} by ${step} ${unit}`}
        >
          <IconMinus size={20} color={Colors.primary} />
        </Pressable>

        {/* Value display */}
        <View className="min-w-[72px] items-center">
          <Text className="text-primary text-[28px] font-medium leading-tight">
            {displayValue}
          </Text>
        </View>

        {/* Increment */}
        <Pressable
          onPress={() => increment(false)}
          onLongPress={() => startLongPress('inc')}
          onPressOut={stopLongPress}
          delayLongPress={400}
          className="w-[44px] h-[44px] bg-hero rounded-btn-sm items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label} by ${step} ${unit}`}
        >
          <IconPlus size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Step footer */}
      <Text className="text-label text-[10px] mt-1.5">
        {resolvedStepLabel}
      </Text>
    </View>
  );
}
