import { useEffect } from 'react';
import { Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface UndoBarProps {
  message: string;
  onUndo: () => void;
  onDismiss?: () => void;
  autoHideMs?: number;
}

export function UndoBar({
  message,
  onUndo,
  onDismiss,
  autoHideMs = 5000,
}: UndoBarProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, onDismiss]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="flex-row items-center bg-amber-bg rounded-card px-3 py-2"
    >
      <Text className="text-amber text-body-sm flex-1">{message}</Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo"
      >
        <Text className="text-amber text-subtitle underline">undo</Text>
      </Pressable>
    </Animated.View>
  );
}
