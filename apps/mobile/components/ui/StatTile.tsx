import { View, Text } from 'react-native';

interface StatTileProps {
  label: string;
  value: string;
  className?: string;
}

export function StatTile({ label, value, className = '' }: StatTileProps) {
  return (
    <View className={`bg-stat-tile rounded-btn-sm p-2 ${className}`}>
      <Text className="text-ambient text-label-xs uppercase tracking-widest">
        {label}
      </Text>
      <Text className="text-primary text-subtitle font-medium">
        {value}
      </Text>
    </View>
  );
}
