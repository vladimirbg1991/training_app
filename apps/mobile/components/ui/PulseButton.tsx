import { Pressable, Text } from 'react-native';

interface PulseButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function PulseButton({ title, onPress, variant = 'primary', className = '' }: PulseButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-btn ${
        isPrimary ? 'bg-accent min-h-btn' : 'bg-card border border-border-subtle min-h-btn-sm'
      } ${className}`}
    >
      <Text className={`font-medium ${isPrimary ? 'text-accent-text text-[14px]' : 'text-ambient text-[13px]'}`}>
        {title}
      </Text>
    </Pressable>
  );
}
