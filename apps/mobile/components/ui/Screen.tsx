import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <SafeAreaView className={`flex-1 bg-page ${className}`}>
      {children}
    </SafeAreaView>
  );
}
