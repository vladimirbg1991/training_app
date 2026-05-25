import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateString(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HomeScreen(): React.JSX.Element {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.username ?? 'Lifter';
  const initials = (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header: date + greeting + avatar */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1">
            <Text className="text-label text-body-sm">{getDateString()}</Text>
            <Text className="text-primary text-title mt-0.5">
              {getGreeting()}, {displayName}
            </Text>
          </View>
          <View
            className="w-9 h-9 rounded-[11px] bg-hero items-center justify-center"
            accessibilityRole="image"
            accessibilityLabel={`Profile avatar for ${displayName}`}
          >
            <Text className="text-primary text-body-sm font-medium">
              {initials || '?'}
            </Text>
          </View>
        </View>

        {/* Hero card: today's routine */}
        <View className="bg-hero rounded-card-hero p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-ambient text-label-xs uppercase tracking-widest">
              TODAY
            </Text>
            <View className="bg-stat-tile px-2 py-0.5 rounded-pill">
              <Text className="text-ambient text-label-xs">no routine set</Text>
            </View>
          </View>
          <Text className="text-primary text-subtitle font-medium mb-3">
            Ready when you are
          </Text>
          <Text className="text-ambient text-body-sm mb-4">
            Start an empty workout or pick a routine to follow.
          </Text>
          <Link href="/(lifter)/(home)/active-workout" asChild>
            <Pressable
              className="bg-accent rounded-btn min-h-btn items-center justify-center flex-row gap-2"
              accessibilityRole="button"
              accessibilityLabel="Start workout"
            >
              <Text className="text-accent-text text-[14px] font-medium">
                Start workout
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Secondary actions */}
        <View className="flex-row gap-2 mb-5">
          <Link href="/(lifter)/(workout)" asChild>
            <Pressable
              className="flex-1 h-[42px] rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Start empty workout"
            >
              <Text className="text-ambient text-body-sm">+ Empty workout</Text>
            </Pressable>
          </Link>
          <Link href="/(modals)/qr-scan" asChild>
            <Pressable
              className="flex-1 h-[42px] rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Scan gym equipment QR code"
            >
              <Text className="text-ambient text-body-sm">Scan equipment</Text>
            </Pressable>
          </Link>
        </View>

        {/* This week summary */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          THIS WEEK
        </Text>
        <View className="bg-card rounded-card p-card-pad mb-5">
          <View className="flex-row justify-between items-end mb-3">
            <View>
              <Text className="text-primary text-hero-num font-medium" style={{ letterSpacing: -0.5 }}>
                —
              </Text>
              <Text className="text-label text-label-xs mt-1">
                total volume · 0 sessions
              </Text>
            </View>
          </View>
          {/* Week histogram placeholder */}
          <View className="flex-row items-end gap-1 h-8">
            {DAY_LABELS.map((day, i) => (
              <View key={`day-${i}`} className="flex-1 items-center">
                <View className="w-full h-0.5 rounded-sm bg-stat-tile border-[0.5px] border-dashed border-border-subtle" />
                <Text className="text-label text-[9px] mt-1.5">{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent milestones */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          RECENT MILESTONES
        </Text>
        <View className="bg-card rounded-card p-card-pad mb-4">
          <View className="items-center py-4">
            <Text className="text-ambient text-body-sm">
              Complete your first workout to see milestones here.
            </Text>
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
