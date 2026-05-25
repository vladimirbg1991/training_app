/**
 * Screen 21 — Exercise Progress Deep Dive
 *
 * Shows historical performance for a single exercise: estimated 1RM, max weight,
 * max reps, volume, RPE trends, and recent sessions with set chips.
 *
 * Receives exerciseId via route params (from exercise detail or library screen).
 * Falls back to a standalone picker if no param is provided.
 *
 * All data is read from local SQLite via PowerSync — never from the network.
 */

import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@powersync/react-native';
import { IconChevronLeft } from '@tabler/icons-react-native';

import { estimateOneRepMax, roundToHalf, formatVolume } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

type MetricTab = 'e1rm' | 'top_set' | 'volume' | 'rpe';
type RangePill = '3M' | '6M' | '1Y' | 'All';

interface SetRow {
  id: string;
  session_id: string;
  weight_value: number | null;
  weight_unit: string;
  reps: number | null;
  rpe: number | null;
  is_warmup: number;
  is_personal_record: number;
  performed_at: string;
  session_started_at: string;
  session_name: string | null;
}

interface SessionGroup {
  sessionId: string;
  date: string;
  sessionName: string | null;
  sets: SetRow[];
  bestE1rm: number;
  bestE1rmUnit: string;
  totalVolume: number;
}

// ============================================================================
// Helpers
// ============================================================================

const METRIC_TABS: { key: MetricTab; label: string }[] = [
  { key: 'e1rm', label: 'Est. 1RM' },
  { key: 'top_set', label: 'Top Set' },
  { key: 'volume', label: 'Volume' },
  { key: 'rpe', label: 'RPE' },
];

const RANGE_PILLS: RangePill[] = ['3M', '6M', '1Y', 'All'];

function rangeToDays(range: RangePill): number | null {
  switch (range) {
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case 'All': return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Simple linear regression: returns slope and R-squared.
 * x = index (0..n-1), y = metric values.
 */
function linearTrend(values: number[]): { slope: number; r2: number } | null {
  const n = values.length;
  if (n < 3) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
    sumY2 += values[i]! * values[i]!;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;

  const ssRes = values.reduce((sum, y, i) => {
    const predicted = (sumY / n) + slope * (i - sumX / n);
    return sum + (y - predicted) ** 2;
  }, 0);
  const ssTot = values.reduce((sum, y) => sum + (y - sumY / n) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, r2 };
}

// ============================================================================
// Component
// ============================================================================

export default function ExerciseChartScreen() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const { user } = useUser();
  const userId = user?.id ?? '';

  // User preferred unit
  const { data: userRows } = useQuery(
    userId
      ? `SELECT default_unit FROM users WHERE id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: Array<{ default_unit: string }> | undefined };
  const preferredUnit = (userRows?.[0]?.default_unit as 'kg' | 'lb') ?? 'kg';

  const [activeMetric, setActiveMetric] = useState<MetricTab>('e1rm');
  const [activeRange, setActiveRange] = useState<RangePill>('All');

  // --------------------------------------------------------------------------
  // Exercise metadata
  // --------------------------------------------------------------------------
  const { data: exerciseRows } = useQuery(
    exerciseId
      ? `SELECT name, body_part, target_muscle, equipment_id FROM exercises WHERE id = ? LIMIT 1`
      : `SELECT 1 WHERE 0`,
    exerciseId ? [exerciseId] : [],
  );
  const exercise = (exerciseRows as Array<{ name: string; body_part: string | null; target_muscle: string | null }> | undefined)?.[0];

  // --------------------------------------------------------------------------
  // All sets for this exercise (joined with session for date/name)
  // --------------------------------------------------------------------------
  const { data: setRows } = useQuery(
    exerciseId && userId
      ? `SELECT ws.id, ws.session_id, ws.weight_value, ws.weight_unit, ws.reps,
                ws.rpe, ws.is_warmup, ws.is_personal_record, ws.performed_at,
                s.started_at AS session_started_at, s.name AS session_name
         FROM workout_sets ws
         JOIN workout_sessions s ON ws.session_id = s.id
         WHERE ws.exercise_id = ? AND ws.user_id = ? AND s.status = 'completed'
         ORDER BY ws.performed_at ASC`
      : `SELECT 1 WHERE 0`,
    exerciseId && userId ? [exerciseId, userId] : [],
  ) as { data: SetRow[] | undefined };

  const allSets = setRows ?? [];

  // --------------------------------------------------------------------------
  // Compute: range-filtered, grouped by session
  // --------------------------------------------------------------------------
  const { sessionGroups, filteredSets } = useMemo(() => {
    const days = rangeToDays(activeRange);
    const cutoff = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const filtered = cutoff
      ? allSets.filter((s) => s.session_started_at >= cutoff)
      : allSets;

    // Group by session
    const groupMap = new Map<string, SessionGroup>();
    for (const set of filtered) {
      let group = groupMap.get(set.session_id);
      if (!group) {
        group = {
          sessionId: set.session_id,
          date: set.session_started_at,
          sessionName: set.session_name,
          sets: [],
          bestE1rm: 0,
          bestE1rmUnit: preferredUnit,
          totalVolume: 0,
        };
        groupMap.set(set.session_id, group);
      }
      group.sets.push(set);

      if (!set.is_warmup && set.weight_value && set.reps) {
        const e1rm = estimateOneRepMax(set.weight_value, set.reps);
        if (e1rm > group.bestE1rm) {
          group.bestE1rm = e1rm;
          group.bestE1rmUnit = set.weight_unit || preferredUnit;
        }
        group.totalVolume += set.weight_value * set.reps;
      }
    }

    return {
      sessionGroups: Array.from(groupMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      filteredSets: filtered,
    };
  }, [allSets, activeRange, preferredUnit]);

  // --------------------------------------------------------------------------
  // Compute all-time bests (across ALL data, not range-filtered)
  // --------------------------------------------------------------------------
  const allTimeBests = useMemo(() => {
    const working = allSets.filter((s) => !s.is_warmup && s.weight_value && s.reps);
    if (working.length === 0) return null;

    let bestE1rm = 0, bestE1rmDate = '', bestE1rmUnit = preferredUnit as string;
    let maxWeight = 0, maxWeightDate = '', maxWeightUnit = preferredUnit as string;
    let maxReps = 0, maxRepsDate = '';

    for (const set of working) {
      const w = set.weight_value!;
      const r = set.reps!;
      const e1rm = estimateOneRepMax(w, r);
      const unit = set.weight_unit || preferredUnit;

      if (e1rm > bestE1rm) { bestE1rm = e1rm; bestE1rmDate = set.performed_at; bestE1rmUnit = unit; }
      if (w > maxWeight) { maxWeight = w; maxWeightDate = set.performed_at; maxWeightUnit = unit; }
      if (r > maxReps) { maxReps = r; maxRepsDate = set.performed_at; }
    }

    return {
      bestE1rm: roundToHalf(bestE1rm), bestE1rmDate, bestE1rmUnit,
      maxWeight, maxWeightDate, maxWeightUnit,
      maxReps, maxRepsDate,
    };
  }, [allSets, preferredUnit]);

  // --------------------------------------------------------------------------
  // Compute: metric-specific data points for the text-based chart
  // --------------------------------------------------------------------------
  const chartData = useMemo(() => {
    // Use session groups in chronological order (oldest first)
    const chronological = [...sessionGroups].reverse();
    const last10 = chronological.slice(-10);

    return last10.map((group) => {
      const working = group.sets.filter((s) => !s.is_warmup && s.weight_value && s.reps);
      if (working.length === 0) return { date: group.date, value: 0 };

      switch (activeMetric) {
        case 'e1rm':
          return { date: group.date, value: group.bestE1rm };
        case 'top_set': {
          let topWeight = 0;
          for (const s of working) {
            if (s.weight_value! > topWeight) topWeight = s.weight_value!;
          }
          return { date: group.date, value: topWeight };
        }
        case 'volume':
          return { date: group.date, value: group.totalVolume };
        case 'rpe': {
          const withRpe = group.sets.filter((s) => s.rpe !== null);
          const avg = withRpe.length > 0
            ? withRpe.reduce((sum, s) => sum + s.rpe!, 0) / withRpe.length
            : 0;
          return { date: group.date, value: Math.round(avg * 10) / 10 };
        }
      }
    }).filter((d) => d.value > 0);
  }, [sessionGroups, activeMetric]);

  // --------------------------------------------------------------------------
  // Compute: latest value, delta vs start, and insight
  // --------------------------------------------------------------------------
  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1]!.value : null;
  const firstValue = chartData.length > 1 ? chartData[0]!.value : null;
  const deltaPercent = latestValue !== null && firstValue !== null && firstValue > 0
    ? Math.round(((latestValue - firstValue) / firstValue) * 100)
    : null;

  // Derive display unit from actual data (allTimeBests or latest set)
  const dataUnit = allTimeBests?.bestE1rmUnit ?? (allSets.length > 0 ? (allSets[allSets.length - 1]!.weight_unit || preferredUnit) : preferredUnit);
  const metricUnit = activeMetric === 'rpe' ? '' : ` ${dataUnit}`;

  const trend = useMemo(() => {
    if (activeMetric === 'rpe') return null; // RPE trend is not useful as an "insight"
    return linearTrend(chartData.map((d) => d.value));
  }, [chartData, activeMetric]);

  const insightText = useMemo(() => {
    if (!trend || trend.r2 < 0.3 || chartData.length < 5) return null;
    const perSession = roundToHalf(Math.abs(trend.slope));
    const direction = trend.slope > 0 ? 'adding' : 'losing';

    switch (activeMetric) {
      case 'e1rm': return `You're ${direction} ~${perSession} ${dataUnit} per session on est. 1RM`;
      case 'top_set': return `You're ${direction} ~${perSession} ${dataUnit} per session on top set`;
      case 'volume': return `Volume is ${trend.slope > 0 ? 'increasing' : 'decreasing'} by ~${formatVolume(perSession, dataUnit)} per session`;
      default: return null;
    }
  }, [trend, activeMetric, chartData.length, dataUnit]);

  // --------------------------------------------------------------------------
  // Empty state guard
  // --------------------------------------------------------------------------
  const hasData = allSets.length > 0;
  const exerciseName = exercise?.name ?? 'Exercise';
  const exerciseSubtitle = [exercise?.body_part, exercise?.target_muscle].filter(Boolean).join(' \u00B7 ');

  if (!exerciseId) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <ScrollView className="flex-1 px-4 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={20} color={Colors.label} />
            <Text className="text-label text-body-sm ml-1">Back</Text>
          </Pressable>
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-ambient text-body-sm text-center">
              Select an exercise from the library to view its progress chart.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* ================================================================= */}
        {/* Header                                                            */}
        {/* ================================================================= */}
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <IconChevronLeft size={20} color={Colors.label} />
          <Text className="text-label text-body-sm ml-1">Back</Text>
        </Pressable>

        <Text
          className="text-primary text-title mb-1"
          accessibilityRole="header"
        >
          {exerciseName}
        </Text>
        {exerciseSubtitle.length > 0 && (
          <Text className="text-ambient text-body-sm mb-5">{exerciseSubtitle}</Text>
        )}

        {/* ================================================================= */}
        {/* Hero card: ALL-TIME BESTS                                         */}
        {/* ================================================================= */}
        {!hasData ? (
          <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-8">
            <Text className="text-ambient text-body-sm text-center">
              No sets logged for this exercise yet.{'\n'}Log your first workout to see progress.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              ALL-TIME BESTS
            </Text>
            <View className="bg-card rounded-card p-card-pad mb-card-gap">
              <View className="flex-row gap-2">
                {/* Est. 1RM */}
                <View className="flex-1 bg-stat-tile rounded-btn-sm px-3 py-3">
                  <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                    Est. 1RM
                  </Text>
                  <Text className="text-primary text-subtitle font-medium">
                    {allTimeBests ? `${allTimeBests.bestE1rm} ${allTimeBests.bestE1rmUnit}` : '\u2014'}
                  </Text>
                  {allTimeBests && (
                    <Text className="text-ambient text-[10px] mt-0.5">
                      {formatShortDate(allTimeBests.bestE1rmDate)}
                    </Text>
                  )}
                </View>
                {/* Max Weight */}
                <View className="flex-1 bg-stat-tile rounded-btn-sm px-3 py-3">
                  <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                    Max Weight
                  </Text>
                  <Text className="text-primary text-subtitle font-medium">
                    {allTimeBests ? `${allTimeBests.maxWeight} ${allTimeBests.maxWeightUnit}` : '\u2014'}
                  </Text>
                  {allTimeBests && (
                    <Text className="text-ambient text-[10px] mt-0.5">
                      {formatShortDate(allTimeBests.maxWeightDate)}
                    </Text>
                  )}
                </View>
                {/* Max Reps */}
                <View className="flex-1 bg-stat-tile rounded-btn-sm px-3 py-3">
                  <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                    Max Reps
                  </Text>
                  <Text className="text-primary text-subtitle font-medium">
                    {allTimeBests ? `${allTimeBests.maxReps}` : '\u2014'}
                  </Text>
                  {allTimeBests && (
                    <Text className="text-ambient text-[10px] mt-0.5">
                      {formatShortDate(allTimeBests.maxRepsDate)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* ============================================================= */}
            {/* Metric toggle tabs                                            */}
            {/* ============================================================= */}
            <View className="flex-row mb-3">
              {METRIC_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveMetric(tab.key)}
                  className={`flex-1 py-2 items-center rounded-pill mx-0.5 ${
                    activeMetric === tab.key ? 'bg-accent' : 'bg-stat-tile'
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeMetric === tab.key }}
                  accessibilityLabel={`View ${tab.label} trend`}
                >
                  <Text
                    className={`text-body-sm ${
                      activeMetric === tab.key ? 'text-accent-text font-medium' : 'text-label'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ============================================================= */}
            {/* Chart card                                                    */}
            {/* ============================================================= */}
            <View className="bg-card rounded-card p-card-pad mb-3">
              {/* Headline */}
              <View className="flex-row items-baseline justify-between mb-3">
                <View>
                  <Text className="text-ambient text-label-xs uppercase tracking-widest">
                    Latest {METRIC_TABS.find((t) => t.key === activeMetric)?.label}
                  </Text>
                  <Text className="text-primary text-hero-num font-medium">
                    {latestValue !== null
                      ? activeMetric === 'rpe'
                        ? latestValue.toFixed(1)
                        : `${roundToHalf(latestValue)}${metricUnit}`
                      : '\u2014'}
                  </Text>
                </View>
                {deltaPercent !== null && (
                  <View
                    className={`rounded-pill px-2 py-1 ${
                      deltaPercent >= 0 ? 'bg-stat-tile' : 'bg-stat-tile'
                    }`}
                  >
                    <Text
                      className={`text-body-sm font-medium ${
                        deltaPercent >= 0 ? 'text-positive' : 'text-coral'
                      }`}
                      style={deltaPercent >= 0 ? { color: Colors.positive } : { color: Colors.coral }}
                    >
                      {deltaPercent >= 0 ? '+' : ''}{deltaPercent}% vs start
                    </Text>
                  </View>
                )}
              </View>

              {/* Text-based chart: last 10 data points as horizontal bars */}
              {chartData.length < 2 ? (
                <View className="items-center py-6">
                  <Text className="text-ambient text-body-sm text-center">
                    Log more workouts to see your chart
                  </Text>
                </View>
              ) : (
                <View>
                  {(() => {
                    const maxVal = Math.max(...chartData.map((d) => d.value));
                    return chartData.map((point, idx) => {
                      const barWidth = maxVal > 0 ? Math.max(8, (point.value / maxVal) * 100) : 0;
                      return (
                        <View key={`${point.date}-${idx}`} className="flex-row items-center mb-1.5">
                          <Text className="text-ambient text-[9px] w-10">
                            {formatShortDate(point.date)}
                          </Text>
                          <View className="flex-1 mx-2 h-4 bg-stat-tile rounded-sm overflow-hidden">
                            <View
                              className="h-4 rounded-sm bg-accent"
                              style={{ width: `${barWidth}%` }}
                            />
                          </View>
                          <Text className="text-label text-[10px] w-14 text-right">
                            {activeMetric === 'rpe'
                              ? point.value.toFixed(1)
                              : activeMetric === 'volume'
                                ? formatVolume(point.value, dataUnit)
                                : `${roundToHalf(point.value)} ${dataUnit}`}
                          </Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
            </View>

            {/* ============================================================= */}
            {/* Range pills                                                   */}
            {/* ============================================================= */}
            <View className="flex-row mb-4">
              {RANGE_PILLS.map((range) => (
                <Pressable
                  key={range}
                  onPress={() => setActiveRange(range)}
                  className={`flex-1 py-2 items-center rounded-pill mx-0.5 ${
                    activeRange === range ? 'bg-accent' : 'bg-stat-tile'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeRange === range }}
                  accessibilityLabel={`Show ${range} range`}
                >
                  <Text
                    className={`text-body-sm ${
                      activeRange === range ? 'text-accent-text font-medium' : 'text-label'
                    }`}
                  >
                    {range}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ============================================================= */}
            {/* Insight pill                                                  */}
            {/* ============================================================= */}
            {insightText && (
              <View className="bg-stat-tile rounded-card px-4 py-3 mb-4 flex-row items-center">
                <Text className="text-amber text-body-sm mr-2" style={{ color: Colors.amber }}>
                  {'\u2728'}
                </Text>
                <Text className="text-ambient text-body-sm flex-1">{insightText}</Text>
              </View>
            )}

            {/* ============================================================= */}
            {/* RECENT SESSIONS                                               */}
            {/* ============================================================= */}
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              RECENT SESSIONS
            </Text>
            {sessionGroups.length === 0 ? (
              <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-4">
                <Text className="text-ambient text-body-sm">
                  No sessions in the selected range.
                </Text>
              </View>
            ) : (
              sessionGroups.slice(0, 10).map((group) => (
                <View key={group.sessionId} className="bg-card rounded-card p-card-pad mb-card-gap">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-primary text-body-sm font-medium">
                      {formatDate(group.date)}
                    </Text>
                    <Text className="text-ambient text-[10px]">
                      {group.sessionName ?? 'Workout'}
                    </Text>
                  </View>
                  {/* Set chips */}
                  <View className="flex-row flex-wrap gap-1.5">
                    {group.sets.map((set) => {
                      const weightDisplay = set.weight_value !== null ? String(set.weight_value) : '\u2014';
                      const repsDisplay = set.reps !== null ? String(set.reps) : '\u2014';
                      const isPR = set.is_personal_record === 1;
                      const isWarmup = set.is_warmup === 1;

                      return (
                        <View
                          key={set.id}
                          className={`flex-row items-center bg-stat-tile rounded-pill px-2 py-0.5 ${
                            isPR ? 'border-[1px] border-amber' : ''
                          }`}
                          style={isPR ? { borderColor: Colors.amber } : undefined}
                        >
                          {isWarmup && (
                            <Text className="text-label text-[9px] mr-0.5">W </Text>
                          )}
                          <Text className="text-ambient text-[10px]">
                            {weightDisplay}{set.weight_unit || preferredUnit} {'\u00D7'} {repsDisplay}
                          </Text>
                          {set.rpe !== null && (
                            <Text className="text-label text-[9px] ml-1">@{set.rpe}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {/* Session summary line */}
                  <View className="flex-row items-center mt-2 gap-3">
                    <Text className="text-label text-[10px]">
                      E1RM: {roundToHalf(group.bestE1rm)} {group.bestE1rmUnit}
                    </Text>
                    <Text className="text-label text-[10px]">
                      Vol: {formatVolume(group.totalVolume, group.bestE1rmUnit)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
