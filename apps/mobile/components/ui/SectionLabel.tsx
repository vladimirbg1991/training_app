import { Text } from 'react-native';

interface SectionLabelProps {
  children: string;
  className?: string;
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <Text className={`text-label text-label-xs uppercase tracking-widest mb-2 ${className}`}>
      {children}
    </Text>
  );
}
