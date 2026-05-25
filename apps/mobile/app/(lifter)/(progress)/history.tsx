/**
 * Screen 20 -- History Feed
 *
 * Chronological feed of completed workouts grouped by time period.
 * Uses FlashList for performance. All data from local SQLite via PowerSync.
 */

import { useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useUser } from '@clerk/expo';
import { useQuery } from '@powersync/react-native';
import {
  IconChevronLeft,
  IconCalendar,
  IconFilter,
  IconTrophy,
  IconBarbell,
} from '@tabler/icons-react-native';

import { formatVolume, formatDuration, totalVolume, workingSetCount, averageRPE } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

interface SessionRow {
  id: string;
  user_id: string;
  routine_id: string | null;
  name: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  gym_id: string | null;
}

interface SessionSetRow {
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  weight_value: number | null;
  weight_unit: string;
  reps: number | null;
  rpe: number | null;
  is_warmup: number;
  is_personal_record: number;
}

interface MonthSessionCountRow {
  session_count: number;
}

interface MonthAvgDurationRow {
  avg_duration: number | null;
}

interface MonthPRCountRow {
  pr_count: number;
}

/** A list item: either a section header or a session card. */
type ListItem =
  | { type: 'header'; title: string; key: string }
  | { type: 'session'; session: SessionRow; isHero: boolean; key: string };

// ============================================================================
// Date helpers
// ============================================================================

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function getTimeGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // Same day
  if (isSameDay(date, now)) return 'TODAY';

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'YESTERDAY';

  // This week (Mon-Sun)
  const startOfWeek = getMonday(now);
  if (date >= startOfWeek) return 'THIS WEEK';

  // Last week
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  if (date >= startOfLastWeek) return 'LAST WEEK';

  // Month name
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  const monthLabel = months[date.getMonth()]!;

  // Same year? Just month. Different year? Month + year.
  if (date.getFullYear() === now.getFullYear()) return monthLabel;
  return `${monthLabel} ${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (isSameDay(date, now)) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
}

// ============================================================================
// Data hooks
// ============================================================================

function useCompletedSessions(userId: string) {
  return useQuery<SessionRow>(
    userId
      ? `SELECT id, user_id, routine_id, name, status, started_at, completed_at,
                duration_seconds, notes, gym_id
         FROM workout_sessions
         WHERE user_id = ? AND status = 'completed'
         ORDER BY started_at DESC
         LIMIT 100`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  );
}

/**
 * Fetch all sets for the loaded sessions in a single batch query.
 * This avoids N+1 queries per session.
 */
function useSessionSets(userId: string) {
  return useQuery<SessionSetRow>(
    userId
      ? `SELECT ws.session_id, ws.exercise_id, e.name AS exercise_name,
                ws.weight_value, ws.weight_unit, ws.reps, ws.rpe,
                ws.is_warmup, ws.is_personal_record
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ?
         ORDER BY ws.session_id, ws.set_index ASC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  );
}

function useMonthSessionCount(userId: string) {
  const month = useMemo(() => startOfMonth(), []);
  return useQuery<MonthSessionCountRow>(
    userId
      ? `SELECT COUNT(*) AS session_count
         FROM workout_sessions
         WHERE user_id = ? AND status = 'completed' AND started_at >= ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, month] : [],
  );
}

function useMonthAvgDuration(userId: string) {
  const month = useMemo(() => startOfMonth(), []);
  return useQuery<MonthAvgDurationRow>(
    userId
      ? `SELECT AVG(duration_seconds) AS avg_duration
         FROM workout_sessions
         WHERE user_id = ? AND status = 'completed' AND started_at >= ?
           AND duration_seconds IS NOT NULL`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, month] : [],
  );
}

function useMonthPRCount(userId: string) {
  const month = useMemo(() => startOfMonth(), []);
  return useQuery<MonthPRCountRow>(
    userId
      ? `SELECT COUNT(*) AS pr_count
         FROM workout_sets
         WHERE user_id = ? AND is_personal_record = 1 AND performed_at >= ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, month] : [],
  );
}

// ============================================================================
// Helper: group sets by session
// ============================================================================

interface SessionStats {
  volume: number;
  setCount: number;
  avgRPE: number | null;
  exerciseNames: string[];
  prCount: number;
}

function buildSessionStatsMap(sets: SessionSetRow[]): Map<string, SessionStats> {
  const map = new Map<string, SessionStats>();

  // Group sets by session_id
  const grouped = new Map<string, SessionSetRow[]>();
  for (const set of sets) {
    const existing = grouped.get(set.session_id);
    if (existing) {
      existing.push(set);
    } else {
      grouped.set(set.session_id, [set]);
    }
  }

  for (const [sessionId, sessionSets] of grouped) {
    const vol = totalVolume(
      sessionSets.map((s) => ({
        weightValue: s.weight_value,
        reps: s.reps,
        isWarmup: s.is_warmup === 1,
      })),
    );

    const workingSets = workingSetCount(
      sessionSets.map((s) => ({
        weightValue: s.weight_value,
        reps: s.reps,
        isWarmup: s.is_warmup === 1,
      })),
    );

    const avgRpe = averageRPE(
      sessionSets.map((s) => ({ rpe: s.rpe })),
    );

    // Unique exercise names preserving order
    const seen = new Set<string>();
    const exerciseNames: string[] = [];
    for (const s of sessionSets) {
      if (!seen.has(s.exercise_name)) {
        seen.add(s.exercise_name);
        exerciseNames.push(s.exercise_name);
      }
    }

    const prCount = sessionSets.filter((s) => s.is_personal_record === 1).length;

    map.set(sessionId, {
      volume: vol,
      setCount: workingSets,
      avgRPE: avgRpe,
      exerciseNames,
      prCount,
    });
  }

  return map;
}

// ============================================================================
// Sub-components
// ============================================================================

function SessionCard({
  session,
  stats,
  isHero,
  onPress,
  weightUnit,
}: {
  session: SessionRow;
  stats: SessionStats | undefined;
  isHero: boolean;
  onPress: () => void;
  weightUnit: 'kg' | 'lb';
}) {
  const dateLabel = formatSessionDate(session.started_at);
  const durationLabel = session.duration_seconds
    ? formatDuration(session.duration_seconds)
    : null;
  const volumeLabel = stats ? formatVolume(stats.volume, weightUnit) : '\u2014';
  const setCountLabel = stats ? String(stats.setCount) : '0';
  const rpeLabel = stats?.avgRPE !== null && stats?.avgRPE !== undefined
    ? stats.avgRPE.toFixed(1)
    : '\u2014';
  const prCount = stats?.prCount ?? 0;
  const exerciseNames = stats?.exerciseNames ?? [];
  const sessionName = session.name ?? 'Workout';

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle ${
        isHero ? 'bg-hero' : 'bg-card'
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${sessionName} on ${dateLabel}. ${volumeLabel} volume, ${setCountLabel} sets.`}
    >
      {/* Top row: name + PR badge + date */}
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center flex-1 mr-2">
          <Text
            className="text-primary text-subtitle font-medium"
            numberOfLines={1}
          >
            {sessionName}
          </Text>
          {prCount > 0 && (
            <View className="flex-row items-center bg-amber rounded-pill px-1.5 py-0.5 ml-2">
              <IconTrophy size={10} color={Colors.amberText} />
              <Text className="text-amber-text text-[10px] font-medium ml-0.5">
                {prCount} PR{prCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        <Text className={`text-[11px] ${isHero ? 'text-ambient' : 'text-label'}`}>
          {dateLabel}
        </Text>
      </View>

      {/* Duration */}
      {durationLabel && (
        <Text className="text-label text-body-sm mb-2">
          {durationLabel}
        </Text>
      )}

      {/* Exercise chips */}
      {exerciseNames.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {exerciseNames.slice(0, 6).map((name) => (
            <View
              key={name}
              className="bg-stat-tile rounded-pill px-2 py-1"
            >
              <Text className="text-label text-[11px]" numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
          {exerciseNames.length > 6 && (
            <View className="bg-stat-tile rounded-pill px-2 py-1">
              <Text className="text-label text-[11px]">
                +{exerciseNames.length - 6} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Stat columns: volume, sets, avg RPE */}
      <View className="flex-row gap-4">
        <View>
          <Text className="text-label text-[10px] uppercase tracking-widest">
            volume
          </Text>
          <Text className="text-primary text-body-sm font-medium">
            {volumeLabel}
          </Text>
        </View>
        <View>
          <Text className="text-label text-[10px] uppercase tracking-widest">
            sets
          </Text>
          <Text className="text-primary text-body-sm font-medium">
            {setCountLabel}
          </Text>
        </View>
        <View>
          <Text className="text-label text-[10px] uppercase tracking-widest">
            avg RPE
          </Text>
          <Text className="text-primary text-body-sm font-medium">
            {rpeLabel}
          </Text>
        </View>
      </View>

      {/* Notes (if any) */}
      {session.notes && (
        <View className="mt-2 bg-stat-tile rounded-btn-sm px-2.5 py-1.5">
          <Text className="text-ambient text-[11px] italic" numberOfLines={2}>
            {session.notes}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// Screen component
// ============================================================================

export default function HistoryFeedScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  // -------------------------------------------------------------------------
  // Data queries
  // -------------------------------------------------------------------------

  const { data: userRows } = useQuery(
    userId
      ? `SELECT default_unit FROM users WHERE id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: Array<{ default_unit: string }> | undefined };
  const preferredUnit = (userRows?.[0]?.default_unit as 'kg' | 'lb') ?? 'kg';

  const { data: sessions } = useCompletedSessions(userId);
  const { data: allSets } = useSessionSets(userId);
  const { data: monthSessionData } = useMonthSessionCount(userId);
  const { data: monthDurationData } = useMonthAvgDuration(userId);
  const { data: monthPRData } = useMonthPRCount(userId);

  const sessionList = sessions ?? [];
  const monthSessions = monthSessionData?.[0]?.session_count ?? 0;
  const monthAvgDuration = monthDurationData?.[0]?.avg_duration ?? null;
  const monthPRs = monthPRData?.[0]?.pr_count ?? 0;

  // -------------------------------------------------------------------------
  // Build stats map from batch-loaded sets
  // -------------------------------------------------------------------------

  const statsMap = useMemo(
    () => buildSessionStatsMap(allSets ?? []),
    [allSets],
  );

  // -------------------------------------------------------------------------
  // Build grouped list items with section headers
  // -------------------------------------------------------------------------

  const listItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    let currentGroup = '';

    for (let i = 0; i < sessionList.length; i++) {
      const session = sessionList[i]!;
      const groupLabel = getTimeGroupLabel(session.started_at);

      if (groupLabel !== currentGroup) {
        currentGroup = groupLabel;
        items.push({ type: 'header', title: groupLabel, key: `header-${groupLabel}` });
      }

      items.push({
        type: 'session',
        session,
        isHero: i === 0,
        key: session.id,
      });
    }

    return items;
  }, [sessionList]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSessionPress = useCallback(
    (_sessionId: string) => {
      // TODO: navigate to session detail screen
      // router.push({ pathname: '/(lifter)/(progress)/session/[id]', params: { id: sessionId } });
    },
    [],
  );

  // -------------------------------------------------------------------------
  // FlashList render
  // -------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.type === 'header') {
        return (
          <View className="px-4 pt-4 pb-1">
            <Text className="text-label text-label-xs uppercase tracking-widest">
              {item.title}
            </Text>
          </View>
        );
      }

      return (
        <View className="px-4">
          <SessionCard
            session={item.session}
            stats={statsMap.get(item.session.id)}
            isHero={item.isHero}
            onPress={() => handleSessionPress(item.session.id)}
            weightUnit={preferredUnit}
          />
        </View>
      );
    },
    [statsMap, handleSessionPress, preferredUnit],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const getItemType = useCallback(
    (item: ListItem) => item.type,
    [],
  );

  // -------------------------------------------------------------------------
  // List header component (header + stat strip)
  // -------------------------------------------------------------------------

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Header bar */}
        <View className="flex-row items-center justify-between px-4 pt-4 mb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={18} color={Colors.label} />
          </Pressable>
          <Text
            className="text-primary text-[22px] font-medium"
            accessibilityRole="header"
          >
            History
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              className="w-11 h-11 rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center opacity-40"
              accessibilityRole="button"
              accessibilityLabel="Calendar view"
              disabled
            >
              <IconCalendar size={18} color={Colors.label} />
            </Pressable>
            <Pressable
              className="w-11 h-11 rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center opacity-40"
              accessibilityRole="button"
              accessibilityLabel="Filter workouts"
              disabled
            >
              <IconFilter size={18} color={Colors.label} />
            </Pressable>
          </View>
        </View>

        {/* 3-tile stat strip */}
        <View className="flex-row px-4 mb-2 gap-2">
          <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5">
            <Text className="text-label text-[10px] uppercase tracking-widest mb-0.5">
              THIS MONTH
            </Text>
            <Text className="text-primary text-subtitle font-medium">
              {monthSessions}
            </Text>
            <Text className="text-label text-[10px]">sessions</Text>
          </View>
          <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5">
            <Text className="text-label text-[10px] uppercase tracking-widest mb-0.5">
              AVG DURATION
            </Text>
            <Text className="text-primary text-subtitle font-medium">
              {monthAvgDuration !== null ? formatDuration(monthAvgDuration) : '\u2014'}
            </Text>
            <Text className="text-label text-[10px]">per session</Text>
          </View>
          <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5">
            <Text className="text-label text-[10px] uppercase tracking-widest mb-0.5">
              PRs SET
            </Text>
            <Text className="text-primary text-subtitle font-medium">
              {monthPRs}
            </Text>
            <Text className="text-label text-[10px]">this month</Text>
          </View>
        </View>
      </View>
    ),
    [router, monthSessions, monthAvgDuration, monthPRs],
  );

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  const ListEmpty = useMemo(
    () => (
      <View className="items-center py-16 px-6">
        <IconBarbell size={40} color={Colors.label} />
        <Text className="text-primary text-subtitle font-medium mt-4 mb-2">
          No workouts yet
        </Text>
        <Text className="text-ambient text-body-sm text-center">
          Complete your first workout and it will show up here. Every session gets its own card with volume, sets, and PRs.
        </Text>
      </View>
    ),
    [],
  );

  const ListFooter = useMemo(() => <View className="h-8" />, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlashList<ListItem>
        data={listItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        estimatedItemSize={160}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
