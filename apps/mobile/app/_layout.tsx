import '../global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// NOTE: ClerkProvider and QueryClientProvider will be added when those packages
// are configured. For now, render a simple auth-bypass layout that always shows
// the lifter tabs (for navigation testing).

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Slot />
    </GestureHandlerRootView>
  );
}
