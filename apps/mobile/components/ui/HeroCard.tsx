import { View, Text } from 'react-native';
import type { ReactNode } from 'react';

interface HeroCardProps {
  label?: string;
  title: string;
  children?: ReactNode;
  className?: string;
}

export function HeroCard({ label, title, children, className = '' }: HeroCardProps) {
  return (
    <View className={`bg-hero rounded-card-hero p-4 ${className}`}>
      {label && (
        <Text className="text-ambient text-label-xs uppercase tracking-widest mb-1">
          {label}
        </Text>
      )}
      <Text className="text-primary text-subtitle font-medium mb-3">
        {title}
      </Text>
      {children}
    </View>
  );
}
