import { View } from 'react-native';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-card rounded-card p-card-pad border-[0.5px] border-border-subtle ${className}`}>
      {children}
    </View>
  );
}
