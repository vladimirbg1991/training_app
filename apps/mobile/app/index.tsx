import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

/**
 * Entry point — shows a loading indicator while AuthGate in _layout.tsx
 * determines the correct route based on auth state and user type.
 *
 * This screen is only visible for a fraction of a second during the
 * initial auth check. AuthGate handles all redirect logic exclusively.
 */
export default function Index(): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.page,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}
