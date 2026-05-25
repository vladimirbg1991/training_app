/**
 * Screen 19 -- Progress Dashboard
 *
 * Shows the user's training progress: volume trends, session counts,
 * exercises trending up, stalled exercises, and muscle coverage.
 * All data comes from local SQLite via PowerSync -- never the network.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useQuery } from '@powersync/react-native';
import {
  IconTrendingUp,
  IconAlertTriangle,
  IconBarbell,
  IconChevronRight,
} from '@tabler/icons-react-native';

import { estimateOneRepMax, formatVolume, roundToHalf, convertWeight } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

interface VolumeRow {
  total_volume: number | null;
}

interface SessionCountRow {
  session_count: number;
}

interface WeeklyVolumeRow {
  week_label: string;
  weekly_volume: number;
}

interface ExerciseTrendRow {
  exercise_id: string;
  exercise_name: string;
  body_part: string | null;
}

interface ExerciseSetRow {
  exercise_id: string;
  weight_value: number | null;
  weight_unit: string;
  reps: number | null;
  performed_at: string;
  bodyweight_at_time: number | null;
  bodyweight_unit: string | null;
}

interface MuscleCoverageRow {
  body_part: string;
  set_count: number;
}

// ============================================================================
// Date helpers
// ============================================================================

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ============================================================================
// Custom hooks for progress data
// ============================================================================

function useTotalVolume(userId: string, since: string) {
  return useQuery<VolumeRow>(
    userId
      ? `SELECT SUM(
           (CASE
             WHEN weight_value IS NOT NULL THEN
               CASE WHEN weight_unit = 'lb' THEN weight_value * 0.45359237 ELSE weight_value END
             WHEN bodyweight_at_time IS NOT NULL THEN
               CASE WHEN bodyweight_unit = 'lb' THEN bodyweight_at_time * 0.45359237 ELSE bodyweight_at_time END
             ELSE 0
           END) * reps
         ) AS total_volume
         FROM workout_sets
         WHERE user_id = ? AND is_warmup = 0 AND performed_at > ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

function useSessionCount(userId: string, since: string) {
  return useQuery<SessionCountRow>(
    userId
      ? `SELECT COUNT(DISTINCT id) AS session_count
         FROM workout_sessions
         WHERE user_id = ? AND status = 'completed' AND started_at > ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

function usePreviousPeriodVolume(userId: string, periodStart: string, periodEnd: string) {
  return useQuery<VolumeRow>(
    userId
      ? `SELECT SUM(
           (CASE
             WHEN weight_value IS NOT NULL THEN
               CASE WHEN weight_unit = 'lb' THEN weight_value * 0.45359237 ELSE weight_value END
             WHEN bodyweight_at_time IS NOT NULL THEN
               CASE WHEN bodyweight_unit = 'lb' THEN bodyweight_at_time * 0.45359237 ELSE bodyweight_at_time END
             ELSE 0
           END) * reps
         ) AS total_volume
         FROM workout_sets
         WHERE user_id = ? AND is_warmup = 0 AND performed_at > ? AND performed_at <= ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, periodStart, periodEnd] : [],
  );
}

function useWeeklyVolume(userId: string, weeks: number) {
  const since = daysAgoISO(weeks * 7);
  return useQuery<WeeklyVolumeRow>(
    userId
      ? `SELECT
           strftime('%Y-W%W', performed_at) AS week_label,
           SUM(
             (CASE
               WHEN weight_value IS NOT NULL THEN
                 CASE WHEN weight_unit = 'lb' THEN weight_value * 0.45359237 ELSE weight_value END
               WHEN bodyweight_at_time IS NOT NULL THEN
                 CASE WHEN bodyweight_unit = 'lb' THEN bodyweight_at_time * 0.45359237 ELSE bodyweight_at_time END
               ELSE 0
             END) * reps
           ) AS weekly_volume
         FROM workout_sets
         WHERE user_id = ? AND is_warmup = 0 AND performed_at > ?
         GROUP BY week_label
         ORDER BY week_label ASC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

/** All exercises trained in the last 30 days (unique IDs). */
function useRecentExercises(userId: string) {
  const since = daysAgoISO(30);
  return useQuery<ExerciseTrendRow>(
    userId
      ? `SELECT DISTINCT ws.exercise_id, e.name AS exercise_name, e.body_part
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ? AND ws.is_warmup = 0 AND ws.performed_at > ?
           AND (ws.weight_value IS NOT NULL OR ws.bodyweight_at_time IS NOT NULL) AND ws.reps IS NOT NULL`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

/** All working sets for a user in a given period, ordered by date. */
function useExerciseSets(userId: string, since: string) {
  return useQuery<ExerciseSetRow>(
    userId
      ? `SELECT exercise_id, weight_value, weight_unit, reps, performed_at,
                bodyweight_at_time, bodyweight_unit
         FROM workout_sets
         WHERE user_id = ? AND is_warmup = 0 AND performed_at > ?
           AND (weight_value IS NOT NULL OR bodyweight_at_time IS NOT NULL) AND reps IS NOT NULL
         ORDER BY performed_at ASC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

function useMuscleCoverage(userId: string) {
  const since = daysAgoISO(14);
  return useQuery<MuscleCoverageRow>(
    userId
      ? `SELECT e.body_part, COUNT(*) AS set_count
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ? AND ws.is_warmup = 0 AND ws.performed_at > ?
           AND e.body_part IS NOT NULL
         GROUP BY e.body_part
         ORDER BY set_count DESC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, since] : [],
  );
}

// ============================================================================
// Derived computations
// ============================================================================

interface ExerciseTrendResult {
  exerciseId: string;
  name: string;
  bodyPart: string | null;
  currentE1RM: number;
  currentE1RMUnit: string;
  previousE1RM: number;
  deltaPercent: number;
}

function computeExerciseTrends(
  exercises: ExerciseTrendRow[],
  sets: ExerciseSetRow[],
  defaultUnit: 'kg' | 'lb' = 'kg',
): { trendingUp: ExerciseTrendResult[]; stuck: ExerciseTrendResult[] } {
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const trendingUp: ExerciseTrendResult[] = [];
  const stuck: ExerciseTrendResult[] = [];

  for (const ex of exercises) {
    const exSets = sets.filter((s) => s.exercise_id === ex.exercise_id);
    if (exSets.length < 2) continue;

    // Split into recent (last 14 days) and older
    const recentSets = exSets.filter(
      (s) => now - new Date(s.performed_at).getTime() < fourteenDaysMs,
    );
    const olderSets = exSets.filter(
      (s) => now - new Date(s.performed_at).getTime() >= fourteenDaysMs,
    );

    if (recentSets.length === 0 || olderSets.length === 0) continue;

    let recentBestE1RM = 0;
    let recentBestUnit = defaultUnit as string;
    for (const s of recentSets) {
      const weight = s.weight_value ?? s.bodyweight_at_time ?? 0;
      const e1rm = estimateOneRepMax(weight, s.reps ?? 0);
      if (e1rm > recentBestE1RM) {
        recentBestE1RM = e1rm;
        recentBestUnit = (s.weight_value != null ? s.weight_unit : s.bodyweight_unit) || defaultUnit;
      }
    }
    const olderBestE1RM = Math.max(
      ...olderSets.map((s) => estimateOneRepMax(s.weight_value ?? s.bodyweight_at_time ?? 0, s.reps ?? 0)),
    );

    if (olderBestE1RM <= 0) continue;

    const deltaPercent = ((recentBestE1RM - olderBestE1RM) / olderBestE1RM) * 100;

    const result: ExerciseTrendResult = {
      exerciseId: ex.exercise_id,
      name: ex.exercise_name,
      bodyPart: ex.body_part,
      currentE1RM: recentBestE1RM,
      currentE1RMUnit: recentBestUnit,
      previousE1RM: olderBestE1RM,
      deltaPercent,
    };

    if (deltaPercent > 5) {
      trendingUp.push(result);
    }

    // "Stuck": no improvement and trained for 28+ days
    const oldestSetDate = new Date(exSets[0]!.performed_at).getTime();
    const trainedForDays = (now - oldestSetDate) / (24 * 60 * 60 * 1000);
    if (deltaPercent <= 0 && trainedForDays >= 28) {
      stuck.push(result);
    }
  }

  // Sort trending up by biggest improvement
  trendingUp.sort((a, b) => b.deltaPercent - a.deltaPercent);
  // Sort stuck by worst regression first
  stuck.sort((a, b) => a.deltaPercent - b.deltaPercent);

  return { trendingUp: trendingUp.slice(0, 5), stuck: stuck.slice(0, 5) };
}

// ============================================================================
// Sub-components
// ============================================================================

function VolumeSparkline({ data }: { data: WeeklyVolumeRow[] }) {
  if (data.length === 0) {
    return (
      <View className="h-[90px] items-center justify-center">
        <Text className="text-ambient text-body-sm">
          Log workouts to see your volume trend.
        </Text>
      </View>
    );
  }

  const maxVolume = Math.max(...data.map((d) => d.weekly_volume));
  if (maxVolume <= 0) {
    return (
      <View className="h-[90px] items-center justify-center">
        <Text className="text-ambient text-body-sm">
          Log workouts to see your volume trend.
        </Text>
      </View>
    );
  }

  return (
    <View className="h-[90px] flex-row items-end gap-1">
      {data.map((point, i) => {
        const heightPercent = Math.max(4, (point.weekly_volume / maxVolume) * 100);
        return (
          <View key={point.week_label} className="flex-1 items-center justify-end">
            <View
              className="w-full rounded-t-sm bg-accent"
              style={{ height: `${heightPercent}%`, opacity: 0.4 + 0.6 * (i / Math.max(1, data.length - 1)) }}
            />
          </View>
        );
      })}
    </View>
  );
}

function TrendExerciseRow({
  exercise,
  variant,
}: {
  exercise: ExerciseTrendResult;
  variant: 'up' | 'stuck';
}) {
  const isUp = variant === 'up';
  const sign = exercise.deltaPercent > 0 ? '+' : '';
  const pctLabel = `${sign}${Math.round(exercise.deltaPercent)}%`;

  return (
    <View className="flex-row items-center py-2.5">
      <View
        className={`w-8 h-8 rounded-[10px] items-center justify-center mr-3 ${
          isUp ? 'bg-stat-tile' : 'bg-[#4A1B0C]'
        }`}
      >
        {isUp ? (
          <IconTrendingUp size={16} color={Colors.accent} />
        ) : (
          <IconAlertTriangle size={16} color={Colors.coral} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-primary text-body-sm" numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text className="text-label text-[11px]">
          {exercise.bodyPart ?? 'Unknown'} {'\u00B7'} Est. 1RM {roundToHalf(exercise.currentE1RM)} {exercise.currentE1RMUnit}
        </Text>
      </View>
      <Text
        className={`text-body-sm font-medium ${
          isUp ? 'text-positive' : 'text-coral'
        }`}
      >
        {pctLabel}
      </Text>
    </View>
  );
}

function MuscleCoverageBar({
  label,
  setCount,
  maxCount,
}: {
  label: string;
  setCount: number;
  maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? Math.max(4, (setCount / maxCount) * 100) : 0;

  return (
    <View className="flex-row items-center mb-2">
      <Text className="text-label text-body-sm w-24 capitalize" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-1 h-3 bg-stat-tile rounded-sm overflow-hidden mr-2">
        <View
          className="h-full bg-accent rounded-sm"
          style={{ width: `${widthPercent}%` }}
        />
      </View>
      <Text className="text-ambient text-[11px] w-8 text-right">{setCount}</Text>
    </View>
  );
}

// ============================================================================
// Screen component
// ============================================================================

export default function ProgressDashboardScreen() {
  const { user } = useUser();
  const userId = user?.id ?? '';

  // -------------------------------------------------------------------------
  // User preferred unit
  // -------------------------------------------------------------------------

  const { data: userRows } = useQuery(
    userId
      ? `SELECT default_unit FROM users WHERE id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: Array<{ default_unit: string }> | undefined };
  const preferredUnit = (userRows?.[0]?.default_unit as 'kg' | 'lb') ?? 'kg';

  // -------------------------------------------------------------------------
  // Data queries
  // -------------------------------------------------------------------------

  const thirtyDaysAgo = useMemo(() => daysAgoISO(30), []);
  const sixtyDaysAgo = useMemo(() => daysAgoISO(60), []);

  // Current period (30 days)
  const { data: volumeData } = useTotalVolume(userId, thirtyDaysAgo);
  const { data: sessionData } = useSessionCount(userId, thirtyDaysAgo);

  // Previous period (30-60 days ago) for delta comparison
  const { data: prevVolumeData } = usePreviousPeriodVolume(userId, sixtyDaysAgo, thirtyDaysAgo);
  const { data: prevSessionData } = useSessionCount(userId, sixtyDaysAgo);

  // Weekly volume sparkline (last 8 weeks)
  const { data: weeklyData } = useWeeklyVolume(userId, 8);

  // Exercise trend data
  const { data: recentExercises } = useRecentExercises(userId);
  const { data: exerciseSets } = useExerciseSets(userId, sixtyDaysAgo);

  // Muscle coverage
  const { data: muscleCoverage } = useMuscleCoverage(userId);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const currentVolume = volumeData?.[0]?.total_volume ?? 0;
  const previousVolume = prevVolumeData?.[0]?.total_volume ?? 0;
  const currentSessions = sessionData?.[0]?.session_count ?? 0;
  const previousSessions = prevSessionData?.[0]?.session_count ?? 0;

  const volumeDelta = useMemo(() => {
    if (previousVolume <= 0) return null;
    return Math.round(((currentVolume - previousVolume) / previousVolume) * 100);
  }, [currentVolume, previousVolume]);

  const sessionDelta = useMemo(() => {
    if (previousSessions <= 0) return null;
    return Math.round(((currentSessions - previousSessions) / previousSessions) * 100);
  }, [currentSessions, previousSessions]);

  // Exercise trends
  const { trendingUp, stuck } = useMemo(
    () => computeExerciseTrends(recentExercises ?? [], exerciseSets ?? [], preferredUnit),
    [recentExercises, exerciseSets, preferredUnit],
  );

  // Muscle coverage max for bar scaling
  const maxCoverageCount = useMemo(
    () => Math.max(1, ...(muscleCoverage ?? []).map((m) => m.set_count)),
    [muscleCoverage],
  );

  const hasData = currentSessions > 0 || currentVolume > 0;

  // Hero card sentence
  const heroSentence = useMemo(() => {
    if (!hasData) return "Start logging to see your progress.";

    if (trendingUp.length > 0) {
      const avgDelta = Math.round(
        trendingUp.reduce((s, t) => s + t.deltaPercent, 0) / trendingUp.length,
      );
      return `You're ${avgDelta}% stronger this quarter.`;
    }

    if (currentSessions > 0) {
      return `${currentSessions} sessions logged in the last 30 days.`;
    }

    return "Keep going -- consistency is the key.";
  }, [hasData, trendingUp, currentSessions]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* Hero card                                                         */}
        {/* ================================================================= */}
        <View className="bg-hero rounded-card-hero p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <IconTrendingUp size={14} color={Colors.ambient} />
            <Text className="text-ambient text-label-xs uppercase tracking-widest ml-1.5">
              TRENDING UP
            </Text>
          </View>
          <Text
            className="text-primary text-title font-medium mb-1"
            accessibilityRole="header"
          >
            {heroSentence}
          </Text>
          {hasData && trendingUp.length > 0 && (
            <Text className="text-ambient text-body-sm">
              {trendingUp.length} lift{trendingUp.length !== 1 ? 's' : ''} improving {'\u00B7'} {currentSessions} sessions this month
            </Text>
          )}
        </View>

        {/* ================================================================= */}
        {/* Stat tiles: volume + sessions                                     */}
        {/* ================================================================= */}
        <View className="flex-row mb-4 gap-3">
          <View className="flex-1 bg-stat-tile rounded-card p-3">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
              VOLUME {'\u00B7'} 30D
            </Text>
            <Text className="text-primary text-hero-num font-medium" style={{ letterSpacing: -0.5 }}>
              {hasData ? formatVolume(convertWeight(currentVolume, 'kg', preferredUnit), preferredUnit) : '\u2014'}
            </Text>
            {volumeDelta !== null && (
              <Text
                className={`text-[11px] mt-0.5 ${
                  volumeDelta >= 0 ? 'text-positive' : 'text-coral'
                }`}
              >
                {volumeDelta >= 0 ? '+' : ''}{volumeDelta}% vs prev 30d
              </Text>
            )}
          </View>
          <View className="flex-1 bg-stat-tile rounded-card p-3">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
              SESSIONS {'\u00B7'} 30D
            </Text>
            <Text className="text-primary text-hero-num font-medium" style={{ letterSpacing: -0.5 }}>
              {hasData ? String(currentSessions) : '\u2014'}
            </Text>
            {sessionDelta !== null && (
              <Text
                className={`text-[11px] mt-0.5 ${
                  sessionDelta >= 0 ? 'text-positive' : 'text-coral'
                }`}
              >
                {sessionDelta >= 0 ? '+' : ''}{sessionDelta}% vs prev 30d
              </Text>
            )}
          </View>
        </View>

        {/* ================================================================= */}
        {/* Volume sparkline card                                             */}
        {/* ================================================================= */}
        <View className="bg-card rounded-card p-card-pad mb-4 border-[0.5px] border-border-subtle">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-3">
            WEEKLY VOLUME {'\u00B7'} LAST 8 WEEKS
          </Text>
          <VolumeSparkline data={weeklyData ?? []} />
          {(weeklyData?.length ?? 0) > 0 && (
            <View className="flex-row justify-between mt-2">
              <Text className="text-label text-[10px]">8 weeks ago</Text>
              <Text className="text-label text-[10px]">This week</Text>
            </View>
          )}
        </View>

        {/* ================================================================= */}
        {/* Lifts trending up                                                 */}
        {/* ================================================================= */}
        {trendingUp.length > 0 && (
          <View className="bg-card rounded-card p-card-pad mb-4 border-[0.5px] border-border-subtle">
            <View className="flex-row items-center mb-1">
              <IconTrendingUp size={14} color={Colors.positive} />
              <Text className="text-label text-label-xs uppercase tracking-widest ml-1.5">
                LIFTS TRENDING UP
              </Text>
            </View>
            <Text className="text-ambient text-[11px] mb-2">
              Est. 1RM improved &gt;5% in the last 30 days
            </Text>
            {trendingUp.map((ex) => (
              <TrendExerciseRow key={ex.exerciseId} exercise={ex} variant="up" />
            ))}
          </View>
        )}

        {/* ================================================================= */}
        {/* Stuck for 4+ weeks                                                */}
        {/* ================================================================= */}
        {stuck.length > 0 && (
          <View className="bg-card rounded-card p-card-pad mb-4 border-[0.5px] border-border-subtle">
            <View className="flex-row items-center mb-1">
              <IconAlertTriangle size={14} color={Colors.coral} />
              <Text className="text-coral text-label-xs uppercase tracking-widest ml-1.5">
                STUCK FOR 4+ WEEKS
              </Text>
            </View>
            <Text className="text-ambient text-[11px] mb-2">
              No PR in 28+ days but still training
            </Text>
            {stuck.map((ex) => (
              <TrendExerciseRow key={ex.exerciseId} exercise={ex} variant="stuck" />
            ))}
          </View>
        )}

        {/* ================================================================= */}
        {/* Muscle coverage                                                   */}
        {/* ================================================================= */}
        <View className="bg-card rounded-card p-card-pad mb-4 border-[0.5px] border-border-subtle">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-3">
            MUSCLE COVERAGE {'\u00B7'} LAST 14 DAYS
          </Text>
          {(muscleCoverage?.length ?? 0) === 0 ? (
            <View className="items-center py-4">
              <Text className="text-ambient text-body-sm">
                Log workouts to see which muscles you're hitting.
              </Text>
            </View>
          ) : (
            muscleCoverage!.map((m) => (
              <MuscleCoverageBar
                key={m.body_part}
                label={m.body_part}
                setCount={m.set_count}
                maxCount={maxCoverageCount}
              />
            ))
          )}
        </View>

        {/* ================================================================= */}
        {/* New user empty state                                              */}
        {/* ================================================================= */}
        {!hasData && (
          <View className="bg-card rounded-card p-card-pad mb-4 border-[0.5px] border-border-subtle items-center">
            <IconBarbell size={32} color={Colors.label} />
            <Text className="text-primary text-subtitle font-medium mt-3 mb-1">
              No workouts yet
            </Text>
            <Text className="text-ambient text-body-sm text-center">
              Complete your first workout and your progress dashboard will come to life.
            </Text>
          </View>
        )}

        {/* ================================================================= */}
        {/* Navigation cards to sub-screens                                   */}
        {/* ================================================================= */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2 mt-2">
          EXPLORE
        </Text>

        <Link href="/(lifter)/(progress)/history" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="View workout history"
          >
            <View className="flex-1">
              <Text className="text-primary text-subtitle">History Feed</Text>
              <Text className="text-label text-body-sm">Browse past workouts</Text>
            </View>
            <IconChevronRight size={16} color={Colors.label} />
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/exercise-chart" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="View exercise progress charts"
          >
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Exercise Progress</Text>
              <Text className="text-label text-body-sm">Charts for individual exercises</Text>
            </View>
            <IconChevronRight size={16} color={Colors.label} />
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/body" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="View body measurements"
          >
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Body Measurements</Text>
              <Text className="text-label text-body-sm">Weight, body fat, photos</Text>
            </View>
            <IconChevronRight size={16} color={Colors.label} />
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/records" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="View personal records"
          >
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Personal Records</Text>
              <Text className="text-label text-body-sm">PRs across all exercises</Text>
            </View>
            <IconChevronRight size={16} color={Colors.label} />
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/calendar" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="View training calendar"
          >
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Calendar & Streak</Text>
              <Text className="text-label text-body-sm">Training calendar and streaks</Text>
            </View>
            <IconChevronRight size={16} color={Colors.label} />
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
