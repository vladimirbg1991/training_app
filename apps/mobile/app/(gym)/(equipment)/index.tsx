import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EquipmentScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Equipment
        </Text>
        <Text className="text-primary text-title mb-2">Equipment</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Track and manage all gym equipment, maintenance schedules, and QR
          codes.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-ambient text-body-sm">
            Equipment management coming soon. Inventory tracking, maintenance
            logs, and QR code assignment.
          </Text>
        </View>

        <View className="mt-4">
          <Link href="/(gym)/(dashboard)" className="text-label text-body">
            Back to Dashboard
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
