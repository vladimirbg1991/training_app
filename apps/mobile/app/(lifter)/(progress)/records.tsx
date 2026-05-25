/**
 * Screen 23 — Personal Records Board
 *
 * Displays all-time personal records: lifetime count, recent PRs, and the
 * Big 3 (squat/bench/deadlift) combined total. For v0, PRs are computed live
 * from workout_sets using MAX aggregations (before the PR detection pipeline
 * is fully wired with is_personal_record flags).
 *
 * All data is read from local SQLite via PowerSync — never from the network.
 */

import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useQuery } from '@powersync/react-native';
import { IconChevronLeft, IconTrophy, IconShare } from '@tabler/icons-react-native';

import { estimateOneRepMax, roundToHalf } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

interface ExerciseBestRow {
  exercise_id: string;
  exercise_name: string;
  max_weight: number;
  max_reps: number;
  best_weight_value: number;
  best_reps_for_weight: number;
  performed_at: string;
}

interface PRFlaggedRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  weight_value: number;
  weight_unit: string;
  reps: number;
  is_personal_record: number;
  performed_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isThisQuarter(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const dQuarter = Math.floor(d.getMonth() / 3);
  const nowQuarter = Math.floor(now.getMonth() / 3);
  return dQuarter === nowQuarter && d.getFullYear() === now.getFullYear();
}

// Big 3 exercise name matching (case-insensitive, common variations)
const SQUAT_NAMES = ['squat', 'barbell squat', 'back squat', 'barbell back squat'];
const BENCH_NAMES = ['bench press', 'barbell bench press', 'flat bench press', 'flat barbell bench press'];
const DEADLIFT_NAMES = ['deadlift', 'barbell deadlift', 'conventional deadlift'];

function isBig3(name: string): 'squat' | 'bench' | 'deadlift' | null {
  const lower = name.toLowerCase().trim();
  if (SQUAT_NAMES.includes(lower)) return 'squat';
  if (BENCH_NAMES.includes(lower)) return 'bench';
  if (DEADLIFT_NAMES.includes(lower)) return 'deadlift';
  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function PersonalRecordsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  // --------------------------------------------------------------------------
  // Query: all-time bests per exercise (v0 live computation)
  // --------------------------------------------------------------------------
  const { data: bestRows } = useQuery(
    userId
      ? `SELECT
           ws.exercise_id,
           e.name AS exercise_name,
           MAX(ws.weight_value) AS max_weight,
           MAX(ws.reps) AS max_reps,
           ws.weight_value AS best_weight_value,
           ws.reps AS best_reps_for_weight,
           MAX(ws.performed_at) AS performed_at
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ? AND ws.is_warmup = 0
           AND ws.weight_value IS NOT NULL AND ws.reps IS NOT NULL
           AND ws.weight_value > 0 AND ws.reps > 0
         GROUP BY ws.exercise_id
         ORDER BY MAX(ws.weight_value * (1 + ws.reps / 30.0)) DESC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: ExerciseBestRow[] | undefined };

  const exerciseBests = bestRows ?? [];

  // --------------------------------------------------------------------------
  // Query: PR-flagged sets (once PR detection pipeline is wired)
  // --------------------------------------------------------------------------
  const { data: prFlaggedRows } = useQuery(
    userId
      ? `SELECT ws.id, ws.exercise_id, e.name AS exercise_name,
                ws.weight_value, ws.weight_unit, ws.reps,
                ws.is_personal_record, ws.performed_at
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ? AND ws.is_personal_record = 1
         ORDER BY ws.performed_at DESC
         LIMIT 20`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: PRFlaggedRow[] | undefined };

  const prFlaggedSets = prFlaggedRows ?? [];

  // --------------------------------------------------------------------------
  // Query: all working sets for detailed per-exercise 1RM calculation
  // --------------------------------------------------------------------------
  const { data: allWorkingSets } = useQuery(
    userId
      ? `SELECT ws.exercise_id, e.name AS exercise_name,
                ws.weight_value, ws.weight_unit, ws.reps, ws.performed_at
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = ? AND ws.is_warmup = 0
           AND ws.weight_value IS NOT NULL AND ws.reps IS NOT NULL
           AND ws.weight_value > 0 AND ws.reps > 0
         ORDER BY ws.performed_at DESC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: Array<{ exercise_id: string; exercise_name: string; weight_value: number; weight_unit: string; reps: number; performed_at: string }> | undefined };

  // --------------------------------------------------------------------------
  // Derived: per-exercise estimated 1RM records
  // --------------------------------------------------------------------------
  const exerciseRecords = useMemo(() => {
    const sets = allWorkingSets ?? [];
    const map = new Map<string, {
      exerciseId: string;
      exerciseName: string;
      bestE1rm: number;
      bestWeight: number;
      bestReps: number;
      bestDate: string;
      bestUnit: string;
    }>();

    for (const s of sets) {
      const e1rm = estimateOneRepMax(s.weight_value, s.reps);
      const existing = map.get(s.exercise_id);
      if (!existing || e1rm > existing.bestE1rm) {
        map.set(s.exercise_id, {
          exerciseId: s.exercise_id,
          exerciseName: s.exercise_name,
          bestE1rm: e1rm,
          bestWeight: s.weight_value,
          bestReps: s.reps,
          bestDate: s.performed_at,
          bestUnit: s.weight_unit || 'kg',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.bestE1rm - a.bestE1rm);
  }, [allWorkingSets]);

  // --------------------------------------------------------------------------
  // Derived: PR counts
  // --------------------------------------------------------------------------
  const totalPRCount = exerciseRecords.length;
  const thisMonthCount = exerciseRecords.filter((r) => isThisMonth(r.bestDate)).length;
  const thisQuarterCount = exerciseRecords.filter((r) => isThisQuarter(r.bestDate)).length;

  // Best month: count per month, find the max
  const bestMonthCount = useMemo(() => {
    if (exerciseRecords.length === 0) return 0;
    const monthCounts = new Map<string, number>();
    for (const r of exerciseRecords) {
      const d = new Date(r.bestDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
    return Math.max(0, ...monthCounts.values());
  }, [exerciseRecords]);

  // --------------------------------------------------------------------------
  // Derived: Big 3 lifetime
  // --------------------------------------------------------------------------
  const big3 = useMemo(() => {
    const result: Record<'squat' | 'bench' | 'deadlift', { e1rm: number; date: string; unit: string } | null> = {
      squat: null,
      bench: null,
      deadlift: null,
    };

    for (const record of exerciseRecords) {
      const lift = isBig3(record.exerciseName);
      if (lift) {
        const current = result[lift];
        if (!current || record.bestE1rm > current.e1rm) {
          result[lift] = { e1rm: record.bestE1rm, date: record.bestDate, unit: record.bestUnit };
        }
      }
    }

    const total = (result.squat?.e1rm ?? 0) + (result.bench?.e1rm ?? 0) + (result.deadlift?.e1rm ?? 0);
    // Use the unit from any available Big 3 lift (they should all match for a given user)
    const totalUnit = result.squat?.unit ?? result.bench?.unit ?? result.deadlift?.unit ?? 'kg';
    return { ...result, total, totalUnit };
  }, [exerciseRecords]);

  const hasBig3 = big3.squat || big3.bench || big3.deadlift;

  // --------------------------------------------------------------------------
  // Choose display: prefer PR-flagged sets, fall back to computed records
  // --------------------------------------------------------------------------
  const recentPRs = prFlaggedSets.length > 0
    ? prFlaggedSets.map((pr) => {
        const e1rm = estimateOneRepMax(pr.weight_value, pr.reps);
        const unit = pr.weight_unit || 'kg';
        return {
          id: pr.id,
          exerciseName: pr.exercise_name,
          prType: 'Est. 1RM' as const,
          date: pr.performed_at,
          value: `${roundToHalf(e1rm)} ${unit}`,
          weight: pr.weight_value,
          weightUnit: unit,
          reps: pr.reps,
        };
      })
    : exerciseRecords.slice(0, 15).map((r) => ({
        id: r.exerciseId,
        exerciseName: r.exerciseName,
        prType: 'Est. 1RM' as const,
        date: r.bestDate,
        value: `${roundToHalf(r.bestE1rm)} ${r.bestUnit}`,
        weight: r.bestWeight,
        weightUnit: r.bestUnit,
        reps: r.bestReps,
      }));

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------
  const hasData = exerciseRecords.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* ================================================================= */}
        {/* Header                                                            */}
        {/* ================================================================= */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={20} color={Colors.label} />
            <Text className="text-label text-body-sm ml-1">Back</Text>
          </Pressable>
          <Pressable
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Share records"
          >
            <IconShare size={20} color={Colors.label} />
          </Pressable>
        </View>

        <Text
          className="text-primary text-title mb-5"
          accessibilityRole="header"
        >
          Personal records
        </Text>

        {/* ================================================================= */}
        {/* Empty state                                                       */}
        {/* ================================================================= */}
        {!hasData ? (
          <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-12">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: Colors.amberBg }}
            >
              <IconTrophy size={24} color={Colors.amber} />
            </View>
            <Text className="text-primary text-subtitle font-medium mb-1">
              No records yet
            </Text>
            <Text className="text-ambient text-body-sm text-center">
              Complete workouts to start setting records.
            </Text>
          </View>
        ) : (
          <>
            {/* ============================================================= */}
            {/* Hero card: LIFETIME TOTAL                                     */}
            {/* ============================================================= */}
            <View
              className="rounded-card p-card-pad mb-card-gap"
              style={{ backgroundColor: Colors.amberBg }}
            >
              <View className="flex-row items-center mb-3">
                <IconTrophy size={20} color={Colors.amber} />
                <Text
                  className="text-label-xs uppercase tracking-widest ml-2 font-medium"
                  style={{ color: Colors.amber }}
                >
                  LIFETIME TOTAL
                </Text>
              </View>
              <Text
                className="text-hero-num font-medium mb-3"
                style={{ color: Colors.amber }}
              >
                {totalPRCount} {totalPRCount === 1 ? 'record' : 'records'}
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1 bg-page/20 rounded-btn-sm px-3 py-2">
                  <Text
                    className="text-label-xs uppercase tracking-widest mb-0.5"
                    style={{ color: Colors.amber }}
                  >
                    This month
                  </Text>
                  <Text className="text-subtitle font-medium" style={{ color: Colors.amber }}>
                    {thisMonthCount}
                  </Text>
                </View>
                <View className="flex-1 bg-page/20 rounded-btn-sm px-3 py-2">
                  <Text
                    className="text-label-xs uppercase tracking-widest mb-0.5"
                    style={{ color: Colors.amber }}
                  >
                    This quarter
                  </Text>
                  <Text className="text-subtitle font-medium" style={{ color: Colors.amber }}>
                    {thisQuarterCount}
                  </Text>
                </View>
                <View className="flex-1 bg-page/20 rounded-btn-sm px-3 py-2">
                  <Text
                    className="text-label-xs uppercase tracking-widest mb-0.5"
                    style={{ color: Colors.amber }}
                  >
                    Best month
                  </Text>
                  <Text className="text-subtitle font-medium" style={{ color: Colors.amber }}>
                    {bestMonthCount}
                  </Text>
                </View>
              </View>
            </View>

            {/* ============================================================= */}
            {/* RECENT section                                                */}
            {/* ============================================================= */}
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              RECENT
            </Text>
            {recentPRs.map((pr, idx) => (
              <Pressable
                key={`${pr.id}-${idx}`}
                className="bg-card rounded-card p-card-pad mb-2 flex-row items-center"
                onPress={() =>
                  router.push({
                    pathname: '/(lifter)/(progress)/exercise-chart',
                    params: { exerciseId: pr.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${pr.exerciseName} personal record: ${pr.value}`}
              >
                {/* Trophy tile */}
                <View
                  className="w-10 h-10 rounded-card items-center justify-center mr-3"
                  style={{ backgroundColor: Colors.amberBg }}
                >
                  <IconTrophy size={18} color={Colors.amber} />
                </View>
                {/* Exercise info */}
                <View className="flex-1">
                  <Text className="text-primary text-body-sm font-medium">
                    {pr.exerciseName}
                  </Text>
                  <Text className="text-ambient text-[10px]">
                    {pr.prType} {'\u00B7'} {formatDate(pr.date)} {'\u00B7'} {pr.weight}{pr.weightUnit} {'\u00D7'} {pr.reps}
                  </Text>
                </View>
                {/* Value badge */}
                <View className="bg-stat-tile rounded-pill px-3 py-1.5">
                  <Text className="text-primary text-body-sm font-medium">{pr.value}</Text>
                </View>
              </Pressable>
            ))}

            {/* ============================================================= */}
            {/* BIG 3 LIFETIME                                                */}
            {/* ============================================================= */}
            {hasBig3 && (
              <>
                <Text className="text-label text-label-xs uppercase tracking-widest mt-4 mb-2">
                  BIG 3 LIFETIME
                </Text>
                <View className="bg-card rounded-card p-card-pad mb-card-gap">
                  {/* Squat */}
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-primary text-body-sm">Squat</Text>
                    <Text className="text-primary text-body-sm font-medium">
                      {big3.squat ? `${roundToHalf(big3.squat.e1rm)} ${big3.squat.unit}` : '\u2014'}
                    </Text>
                  </View>
                  <View className="border-t-[0.5px] border-border-subtle" />
                  {/* Bench Press */}
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-primary text-body-sm">Bench Press</Text>
                    <Text className="text-primary text-body-sm font-medium">
                      {big3.bench ? `${roundToHalf(big3.bench.e1rm)} ${big3.bench.unit}` : '\u2014'}
                    </Text>
                  </View>
                  <View className="border-t-[0.5px] border-border-subtle" />
                  {/* Deadlift */}
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-primary text-body-sm">Deadlift</Text>
                    <Text className="text-primary text-body-sm font-medium">
                      {big3.deadlift ? `${roundToHalf(big3.deadlift.e1rm)} ${big3.deadlift.unit}` : '\u2014'}
                    </Text>
                  </View>
                  <View className="border-t-[0.5px] border-border-subtle" />
                  {/* Combined total */}
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-label text-body-sm font-medium">Combined Total</Text>
                    <Text
                      className="text-subtitle font-medium"
                      style={{ color: Colors.amber }}
                    >
                      {big3.total > 0 ? `${roundToHalf(big3.total)} ${big3.totalUnit}` : '\u2014'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
