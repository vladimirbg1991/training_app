import { View, Text } from 'react-native';
import type { ReactNode } from 'react';

interface DraftIndicatorProps {
  isDirty: boolean;
  children: ReactNode;
}

export function DraftIndicator({ isDirty, children }: DraftIndicatorProps) {
  return (
    <View
      className={`relative ${
        isDirty
          ? 'border-[1.5px] border-dashed border-border-active rounded-card'
          : 'border-[0.5px] border-border-subtle rounded-card'
      }`}
    >
      {isDirty && (
        <View className="absolute -top-2.5 right-3 z-10 bg-amber-bg px-2 py-0.5 rounded-pill">
          <Text className="text-amber text-[9px]">unsaved</Text>
        </View>
      )}
      {children}
    </View>
  );
}
