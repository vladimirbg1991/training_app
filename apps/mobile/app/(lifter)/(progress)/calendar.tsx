/**
 * Screen 24 — Training Calendar + Streak
 *
 * Month-navigable calendar grid that color-codes training days by intensity.
 * Includes current/best streak, a selected-day detail card, and a "last 4 weeks"
 * cadence bar chart.
 *
 * Streak computation uses computeStreak() from @gym-app/fitness-logic.
 * Intensity is derived from per-day volume relative to the 30-day rolling average.
 *
 * All data is read from local SQLite via PowerSync — never from the network.
 */

import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@powersync/react-native';
import { IconChevronLeft, IconChevronRight, IconFlame, IconList } from '@tabler/icons-react-native';

import { computeStreak, formatVolume, formatDuration } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

interface SessionDayRow {
  day: string; // YYYY-MM-DD
  sessions: number;
  total_volume: number;
  total_duration: number;
  total_sets: number;
  has_pr: number; // 0 | 1
}

interface SessionDetailRow {
  id: string;
  name: string | null;
  started_at: string;
  duration_seconds: number | null;
  total_volume: number;
  total_sets: number;
  exercise_count: number;
  has_pr: number;
}

// ============================================================================
// Constants
// ============================================================================

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================================================
// Helpers
// ============================================================================

/** Get Monday-based day of week (0 = Mon, 6 = Sun). */
function getMondayDow(date: Date): number {
  const dow = date.getDay(); // 0 = Sun
  return dow === 0 ? 6 : dow - 1;
}

/** Get all calendar days to render for a given month (includes padding). */
function getCalendarDays(year: number, month: number): Array<{ date: string; inMonth: boolean; dayNum: number }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = getMondayDow(firstDay);

  const days: Array<{ date: string; inMonth: boolean; dayNum: number }> = [];

  // Padding days from previous month
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: formatDateKey(d),
      inMonth: false,
      dayNum: d.getDate(),
    });
  }

  // Days of the current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date: formatDateKey(date),
      inMonth: true,
      dayNum: d,
    });
  }

  // Padding days from next month to fill the last row
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: formatDateKey(d),
        inMonth: false,
        dayNum: d.getDate(),
      });
    }
  }

  return days;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey(): string {
  return formatDateKey(new Date());
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ============================================================================
// Component
// ============================================================================

export default function CalendarStreakScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Navigation: month forward/backward
  // --------------------------------------------------------------------------
  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDay(null);
  }, []);

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDay(null);
  }, []);

  // --------------------------------------------------------------------------
  // Query: per-day aggregates (all time, for streak + calendar)
  // --------------------------------------------------------------------------
  const { data: dayRows } = useQuery(
    userId
      ? `SELECT
           DATE(s.started_at) AS day,
           COUNT(DISTINCT s.id) AS sessions,
           COALESCE(SUM(CASE WHEN ws.is_warmup = 0 THEN (CASE WHEN ws.weight_unit = 'lb' THEN ws.weight_value * 0.45359237 ELSE ws.weight_value END) * ws.reps ELSE 0 END), 0) AS total_volume,
           COALESCE(SUM(s.duration_seconds), 0) AS total_duration,
           COUNT(CASE WHEN ws.is_warmup = 0 THEN 1 END) AS total_sets,
           MAX(CASE WHEN ws.is_personal_record = 1 THEN 1 ELSE 0 END) AS has_pr
         FROM workout_sessions s
         LEFT JOIN workout_sets ws ON ws.session_id = s.id
         WHERE s.user_id = ? AND s.status = 'completed'
         GROUP BY DATE(s.started_at)
         ORDER BY day ASC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: SessionDayRow[] | undefined };

  const allDayData = dayRows ?? [];

  // --------------------------------------------------------------------------
  // Streak computation
  // --------------------------------------------------------------------------
  const streakData = useMemo(() => {
    const dates = allDayData.map((d) => d.day);
    return computeStreak(dates);
  }, [allDayData]);

  // --------------------------------------------------------------------------
  // Build day map for the calendar
  // --------------------------------------------------------------------------
  const dayMap = useMemo(() => {
    const map = new Map<string, SessionDayRow>();
    for (const row of allDayData) {
      map.set(row.day, row);
    }
    return map;
  }, [allDayData]);

  // --------------------------------------------------------------------------
  // 30-day rolling average volume (for intensity calculation)
  // --------------------------------------------------------------------------
  const avgVolume30d = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recent = allDayData.filter((d) => d.day >= cutoff && d.total_volume > 0);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, d) => sum + d.total_volume, 0) / recent.length;
  }, [allDayData]);

  // --------------------------------------------------------------------------
  // Calendar grid
  // --------------------------------------------------------------------------
  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const today = todayKey();

  // --------------------------------------------------------------------------
  // Intensity color for a day
  // --------------------------------------------------------------------------
  function getDayStyle(dateKey: string, inMonth: boolean): {
    bgColor: string;
    textColor: string;
    borderColor?: string;
  } {
    if (!inMonth) return { bgColor: 'transparent', textColor: Colors.ambient + '40' };

    const data = dayMap.get(dateKey);
    if (!data) return { bgColor: Colors.card, textColor: Colors.ambient };

    // PR day = amber
    if (data.has_pr) {
      return { bgColor: Colors.amberBg, textColor: Colors.amber };
    }

    // Heavy = accent (volume > 1.2x average)
    if (avgVolume30d > 0 && data.total_volume > avgVolume30d * 1.2) {
      return { bgColor: Colors.accent, textColor: Colors.accentText };
    }

    // Moderate = hero
    return { bgColor: Colors.hero, textColor: Colors.primary };
  }

  // --------------------------------------------------------------------------
  // Selected day detail
  // --------------------------------------------------------------------------
  const selectedDayData = selectedDay ? dayMap.get(selectedDay) : null;

  // Query sessions for the selected day
  const { data: selectedDaySessions } = useQuery(
    userId && selectedDay
      ? `SELECT
           s.id, s.name, s.started_at, s.duration_seconds,
           COALESCE(SUM(CASE WHEN ws.is_warmup = 0 THEN (CASE WHEN ws.weight_unit = 'lb' THEN ws.weight_value * 0.45359237 ELSE ws.weight_value END) * ws.reps ELSE 0 END), 0) AS total_volume,
           COUNT(CASE WHEN ws.is_warmup = 0 THEN 1 END) AS total_sets,
           COUNT(DISTINCT ws.exercise_id) AS exercise_count,
           MAX(CASE WHEN ws.is_personal_record = 1 THEN 1 ELSE 0 END) AS has_pr
         FROM workout_sessions s
         LEFT JOIN workout_sets ws ON ws.session_id = s.id
         WHERE s.user_id = ? AND s.status = 'completed'
           AND DATE(s.started_at) = ?
         GROUP BY s.id
         ORDER BY s.started_at ASC`
      : `SELECT 1 WHERE 0`,
    userId && selectedDay ? [userId, selectedDay] : [],
  ) as { data: SessionDetailRow[] | undefined };

  // --------------------------------------------------------------------------
  // Last 4 weeks cadence
  // --------------------------------------------------------------------------
  const weekCadence = useMemo(() => {
    const weeks: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7); // Monday
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const startKey = formatDateKey(weekStart);
      const endKey = formatDateKey(weekEnd);

      const count = allDayData.filter((d) => d.day >= startKey && d.day <= endKey).length;
      weeks.push(count);
    }
    return weeks;
  }, [allDayData]);

  const maxWeekSessions = Math.max(1, ...weekCadence);

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------
  const hasData = allDayData.length > 0;

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
            accessibilityLabel="Switch to list view"
          >
            <IconList size={20} color={Colors.label} />
          </Pressable>
        </View>

        <Text
          className="text-primary text-title mb-5"
          accessibilityRole="header"
        >
          Calendar
        </Text>

        {/* ================================================================= */}
        {/* Hero card: CURRENT STREAK                                         */}
        {/* ================================================================= */}
        <View className="bg-hero rounded-card p-card-pad mb-card-gap">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <IconFlame size={28} color={Colors.amber} />
              <View className="ml-3">
                <Text className="text-label text-label-xs uppercase tracking-widest">
                  CURRENT STREAK
                </Text>
                <Text className="text-primary text-hero-num font-medium">
                  {hasData ? `${streakData.current} ${streakData.current === 1 ? 'day' : 'days'}` : '0 days'}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-ambient text-label-xs uppercase tracking-widest">Best</Text>
              <Text className="text-label text-subtitle font-medium">
                {streakData.best}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* Calendar grid                                                     */}
        {/* ================================================================= */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          {/* Month navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={goPrevMonth}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              className="p-2"
            >
              <IconChevronLeft size={18} color={Colors.label} />
            </Pressable>
            <Text className="text-primary text-subtitle font-medium">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable
              onPress={goNextMonth}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              className="p-2"
            >
              <IconChevronRight size={18} color={Colors.label} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="flex-row mb-2">
            {WEEKDAY_LABELS.map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-ambient text-[10px]">{day}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((cell, idx) => {
              const style = getDayStyle(cell.date, cell.inMonth);
              const isToday = cell.date === today;
              const isSelected = cell.date === selectedDay;
              const data = dayMap.get(cell.date);

              return (
                <Pressable
                  key={`${cell.date}-${idx}`}
                  onPress={() => {
                    if (cell.inMonth && data) {
                      setSelectedDay(cell.date === selectedDay ? null : cell.date);
                    }
                  }}
                  className="items-center justify-center py-1.5"
                  style={{ width: '14.285%' }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    data
                      ? `${cell.date}: ${data.sessions} session${data.sessions > 1 ? 's' : ''}`
                      : `${cell.date}: no workout`
                  }
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: style.bgColor,
                      borderWidth: isSelected ? 2 : isToday ? 1 : 0,
                      borderColor: isSelected ? Colors.accent : isToday ? Colors.borderActive : 'transparent',
                    }}
                  >
                    <Text
                      className="text-[11px] font-medium"
                      style={{ color: style.textColor }}
                    >
                      {cell.dayNum}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View className="flex-row items-center justify-center mt-3 gap-4">
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: Colors.hero }} />
              <Text className="text-ambient text-[9px]">Moderate</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: Colors.accent }} />
              <Text className="text-ambient text-[9px]">Heavy</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: Colors.amberBg }} />
              <Text className="text-ambient text-[9px]">PR day</Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* Selected day detail card                                          */}
        {/* ================================================================= */}
        {selectedDay && selectedDaySessions && selectedDaySessions.length > 0 && (
          <View className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              {formatShortDate(selectedDay)}
            </Text>
            {(selectedDaySessions as SessionDetailRow[]).map((session, idx) => (
              <View
                key={session.id}
                className={`py-2 ${idx > 0 ? 'border-t-[0.5px] border-border-subtle' : ''}`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-primary text-body-sm font-medium">
                    {session.name ?? 'Workout'}
                  </Text>
                  {session.has_pr === 1 && (
                    <View
                      className="rounded-pill px-2 py-0.5"
                      style={{ backgroundColor: Colors.amberBg }}
                    >
                      <Text className="text-[9px] font-medium" style={{ color: Colors.amber }}>
                        PR
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row gap-3">
                  <Text className="text-ambient text-[10px]">
                    {session.exercise_count} exercise{session.exercise_count !== 1 ? 's' : ''}
                  </Text>
                  <Text className="text-ambient text-[10px]">
                    {session.total_sets} sets
                  </Text>
                  <Text className="text-ambient text-[10px]">
                    {formatVolume(session.total_volume, 'kg')}
                  </Text>
                  {session.duration_seconds !== null && session.duration_seconds > 0 && (
                    <Text className="text-ambient text-[10px]">
                      {formatDuration(session.duration_seconds)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedDay && (!selectedDaySessions || selectedDaySessions.length === 0) && selectedDayData && (
          <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-4">
            <Text className="text-ambient text-body-sm">
              {formatShortDate(selectedDay)}: {selectedDayData.sessions} session{selectedDayData.sessions !== 1 ? 's' : ''} logged
            </Text>
          </View>
        )}

        {/* ================================================================= */}
        {/* CADENCE - LAST 4 WEEKS                                            */}
        {/* ================================================================= */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          CADENCE {'\u00B7'} LAST 4 WEEKS
        </Text>
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          {!hasData ? (
            <View className="items-center py-4">
              <Text className="text-ambient text-body-sm text-center">
                Complete workouts to see your weekly cadence.
              </Text>
            </View>
          ) : (
            <View className="flex-row items-end gap-2 h-20">
              {weekCadence.map((count, idx) => {
                const barHeight = maxWeekSessions > 0
                  ? Math.max(8, (count / maxWeekSessions) * 100)
                  : 0;
                const weekLabel = idx === 3 ? 'This week' : idx === 2 ? 'Last week' : `${3 - idx}w ago`;

                return (
                  <View key={`week-${idx}`} className="flex-1 items-center">
                    <View className="w-full items-center justify-end flex-1">
                      {count > 0 && (
                        <Text className="text-label text-[10px] font-medium mb-1">
                          {count}
                        </Text>
                      )}
                      <View
                        className="w-full rounded-sm"
                        style={{
                          height: `${barHeight}%`,
                          backgroundColor: idx === 3 ? Colors.accent : Colors.hero,
                          minHeight: count > 0 ? 8 : 2,
                        }}
                      />
                    </View>
                    <Text className="text-ambient text-[8px] mt-1">{weekLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ================================================================= */}
        {/* Empty state (if no data at all)                                   */}
        {/* ================================================================= */}
        {!hasData && (
          <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-8">
            <IconFlame size={32} color={Colors.amber} />
            <Text className="text-primary text-subtitle font-medium mt-3 mb-1">
              Start your streak
            </Text>
            <Text className="text-ambient text-body-sm text-center">
              Complete your first workout to start building your training calendar.
            </Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
