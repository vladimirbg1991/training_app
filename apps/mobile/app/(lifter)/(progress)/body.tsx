/**
 * Screen 22 — Body Measurements Logging + Display
 *
 * Tracks body weight, body fat %, lean mass, and circumference measurements.
 * All data is stored in local SQLite via PowerSync and syncs to Supabase.
 *
 * Includes a mandatory health disclaimer per product requirements.
 */

import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { IconChevronLeft, IconPlus } from '@tabler/icons-react-native';

import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

type BodyMetricTab = 'weight' | 'body_fat' | 'measurements';

interface BodyMeasurementRow {
  id: string;
  weight_value: number | null;
  weight_unit: string | null;
  body_fat_percent: number | null;
  lean_mass_value: number | null;
  lean_mass_unit: string | null;
  recorded_at: string;
  notes: string | null;
}

interface CircumferenceRow {
  id: string;
  site: string;
  custom_label: string | null;
  value_cm: number;
  recorded_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const CIRCUMFERENCE_SITES = ['chest', 'arm', 'waist', 'thigh', 'hip', 'calf', 'neck'];

const METRIC_TABS: { key: BodyMetricTab; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'body_fat', label: 'Body Fat' },
  { key: 'measurements', label: 'Measurements' },
];

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDelta(current: number, previous: number): { text: string; isPositive: boolean } {
  const diff = current - previous;
  const sign = diff >= 0 ? '+' : '';
  return {
    text: `${sign}${diff.toFixed(1)}`,
    isPositive: diff >= 0,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function BodyMeasurementsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';
  const db = usePowerSync();

  const [activeTab, setActiveTab] = useState<BodyMetricTab>('weight');
  const [showLogForm, setShowLogForm] = useState(false);

  // Inline form state
  const [formWeight, setFormWeight] = useState('');
  const [formBodyFat, setFormBodyFat] = useState('');
  const [formSite, setFormSite] = useState<string>('chest');
  const [formCircValue, setFormCircValue] = useState('');

  // --------------------------------------------------------------------------
  // Queries: body measurements (ordered newest first for display)
  // --------------------------------------------------------------------------
  const { data: measurementRows } = useQuery(
    userId
      ? `SELECT id, weight_value, weight_unit, body_fat_percent, lean_mass_value,
                lean_mass_unit, recorded_at, notes
         FROM body_measurements
         WHERE user_id = ?
         ORDER BY recorded_at DESC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: BodyMeasurementRow[] | undefined };

  const measurements = measurementRows ?? [];

  // --------------------------------------------------------------------------
  // Queries: circumference measurements (latest per site)
  // --------------------------------------------------------------------------
  const { data: circumRows } = useQuery(
    userId
      ? `SELECT bc.id, bc.site, bc.custom_label, bc.value_cm, bc.recorded_at
         FROM body_circumference bc
         INNER JOIN (
           SELECT site, MAX(recorded_at) as max_date
           FROM body_circumference
           WHERE user_id = ?
           GROUP BY site
         ) latest ON bc.site = latest.site AND bc.recorded_at = latest.max_date
         WHERE bc.user_id = ?
         ORDER BY bc.site ASC`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, userId] : [],
  ) as { data: CircumferenceRow[] | undefined };

  const latestCirc = circumRows ?? [];

  // Previous circumference measurements (for delta calculation)
  const { data: prevCircRows } = useQuery(
    userId
      ? `SELECT bc.id, bc.site, bc.value_cm, bc.recorded_at
         FROM body_circumference bc
         INNER JOIN (
           SELECT site, MAX(recorded_at) as max_date
           FROM body_circumference
           WHERE user_id = ?
           GROUP BY site
           HAVING COUNT(*) > 1
         ) latest ON bc.site = latest.site
         INNER JOIN (
           SELECT site, MAX(recorded_at) as prev_date
           FROM body_circumference
           WHERE user_id = ? AND recorded_at < (
             SELECT MAX(recorded_at) FROM body_circumference
             WHERE user_id = ? AND site = body_circumference.site
           )
           GROUP BY site
         ) prev ON bc.site = prev.site AND bc.recorded_at = prev.prev_date
         WHERE bc.user_id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, userId, userId, userId] : [],
  ) as { data: CircumferenceRow[] | undefined };

  const previousCircMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of prevCircRows ?? []) {
      map.set(row.site, row.value_cm);
    }
    return map;
  }, [prevCircRows]);

  // --------------------------------------------------------------------------
  // Derived data
  // --------------------------------------------------------------------------
  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;
  const currentWeight = latestMeasurement?.weight_value ?? null;
  const currentUnit = latestMeasurement?.weight_unit ?? 'kg';
  const currentBodyFat = latestMeasurement?.body_fat_percent ?? null;
  const currentLeanMass = latestMeasurement?.lean_mass_value ?? null;

  // 90-day weight delta
  const weightDelta90 = useMemo(() => {
    if (!currentWeight || measurements.length < 2) return null;
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const older = measurements.filter((m) => m.recorded_at <= cutoff && m.weight_value !== null);
    if (older.length === 0) return null;
    const oldWeight = older[0]!.weight_value!;
    return formatDelta(currentWeight, oldWeight);
  }, [currentWeight, measurements]);

  // Body fat delta (vs previous measurement)
  const bodyFatDelta = useMemo(() => {
    if (!currentBodyFat || measurements.length < 2) return null;
    const prev = measurements.find((m, i) => i > 0 && m.body_fat_percent !== null);
    if (!prev?.body_fat_percent) return null;
    return formatDelta(currentBodyFat, prev.body_fat_percent);
  }, [currentBodyFat, measurements]);

  // Lean mass delta
  const leanMassDelta = useMemo(() => {
    if (!currentLeanMass || measurements.length < 2) return null;
    const prev = measurements.find((m, i) => i > 0 && m.lean_mass_value !== null);
    if (!prev?.lean_mass_value) return null;
    return formatDelta(currentLeanMass, prev.lean_mass_value);
  }, [currentLeanMass, measurements]);

  // Weight sparkline: last 10 weight readings
  const weightSparkline = useMemo(() => {
    const withWeight = measurements.filter((m) => m.weight_value !== null).slice(0, 10).reverse();
    if (withWeight.length < 2) return null;
    const values = withWeight.map((m) => m.weight_value!);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((v) => ((v - min) / range) * 100);
  }, [measurements]);

  // --------------------------------------------------------------------------
  // Log measurement handler
  // --------------------------------------------------------------------------
  const handleLogWeight = useCallback(async () => {
    const weightVal = parseFloat(formWeight);
    const bodyFatVal = formBodyFat ? parseFloat(formBodyFat) : null;

    if (isNaN(weightVal) || weightVal <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight value.');
      return;
    }
    if (bodyFatVal !== null && (isNaN(bodyFatVal) || bodyFatVal < 0 || bodyFatVal > 100)) {
      Alert.alert('Invalid body fat', 'Body fat should be between 0 and 100%.');
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const leanMass = bodyFatVal !== null ? weightVal * (1 - bodyFatVal / 100) : null;

    await db.execute(
      `INSERT INTO body_measurements (id, user_id, weight_value, weight_unit, body_fat_percent, lean_mass_value, lean_mass_unit, recorded_at, sync_source, created_at, updated_at)
       VALUES (?, ?, ?, 'kg', ?, ?, 'kg', ?, 'app', ?, ?)`,
      [id, userId, weightVal, bodyFatVal, leanMass, now, now, now],
    );

    // Also update the user profile's bodyweight
    await db.execute(
      `UPDATE users SET current_bodyweight_value = ?, current_bodyweight_unit = 'kg', updated_at = ? WHERE id = ?`,
      [weightVal, now, userId],
    );

    setFormWeight('');
    setFormBodyFat('');
    setShowLogForm(false);
  }, [formWeight, formBodyFat, userId, db]);

  const handleLogCircumference = useCallback(async () => {
    const value = parseFloat(formCircValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid measurement', 'Please enter a valid measurement in cm.');
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO body_circumference (id, user_id, site, value_cm, recorded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, formSite, value, now, now, now],
    );

    setFormCircValue('');
  }, [formCircValue, formSite, userId, db]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  const hasAnyData = measurements.length > 0 || latestCirc.length > 0;

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
            onPress={() => setShowLogForm(!showLogForm)}
            className="flex-row items-center bg-accent rounded-btn-sm px-3 py-1.5"
            accessibilityRole="button"
            accessibilityLabel="Add measurement"
          >
            <IconPlus size={14} color={Colors.accentText} />
            <Text className="text-accent-text text-body-sm ml-1 font-medium">Add</Text>
          </Pressable>
        </View>

        <Text
          className="text-primary text-title mb-5"
          accessibilityRole="header"
        >
          Body
        </Text>

        {/* ================================================================= */}
        {/* Hero card: CURRENT BODY WEIGHT                                    */}
        {/* ================================================================= */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          CURRENT BODY WEIGHT
        </Text>
        <View className="bg-hero rounded-card p-card-pad mb-card-gap">
          {currentWeight !== null ? (
            <>
              <View className="flex-row items-baseline justify-between">
                <View className="flex-row items-baseline">
                  <Text className="text-primary text-hero-num font-medium">
                    {currentWeight.toFixed(1)}
                  </Text>
                  <Text className="text-label text-subtitle ml-1">{currentUnit}</Text>
                </View>
                {weightDelta90 && (
                  <View className="bg-stat-tile rounded-pill px-2 py-1">
                    <Text
                      className="text-body-sm font-medium"
                      style={{ color: weightDelta90.isPositive ? Colors.coral : Colors.positive }}
                    >
                      {weightDelta90.text} kg (90d)
                    </Text>
                  </View>
                )}
              </View>
              {/* Weight sparkline placeholder (text-based bars) */}
              {weightSparkline && (
                <View className="flex-row items-end gap-1 h-6 mt-3">
                  {weightSparkline.map((pct, i) => (
                    <View
                      key={`spark-${i}`}
                      className="flex-1 bg-accent rounded-sm"
                      style={{ height: `${Math.max(10, pct)}%` }}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="items-center py-4">
              <Text className="text-ambient text-body-sm text-center">
                Log your first body weight measurement to start tracking.
              </Text>
            </View>
          )}
        </View>

        {/* ================================================================= */}
        {/* Metric tabs                                                       */}
        {/* ================================================================= */}
        <View className="flex-row mb-4">
          {METRIC_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 items-center rounded-pill mx-0.5 ${
                activeTab === tab.key ? 'bg-accent' : 'bg-stat-tile'
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
              accessibilityLabel={`View ${tab.label}`}
            >
              <Text
                className={`text-body-sm ${
                  activeTab === tab.key ? 'text-accent-text font-medium' : 'text-label'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ================================================================= */}
        {/* Tab content: Weight                                               */}
        {/* ================================================================= */}
        {activeTab === 'weight' && (
          <>
            {measurements.length === 0 ? (
              <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-6">
                <Text className="text-ambient text-body-sm text-center">
                  Log your first measurement to track weight trends.
                </Text>
              </View>
            ) : (
              <View className="bg-card rounded-card p-card-pad mb-card-gap">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-3">
                  WEIGHT HISTORY
                </Text>
                {measurements
                  .filter((m) => m.weight_value !== null)
                  .slice(0, 15)
                  .map((m, idx) => (
                    <View
                      key={m.id}
                      className={`flex-row items-center justify-between py-2 ${
                        idx > 0 ? 'border-t-[0.5px] border-border-subtle' : ''
                      }`}
                    >
                      <Text className="text-ambient text-body-sm">
                        {formatDate(m.recorded_at)}
                      </Text>
                      <Text className="text-primary text-body-sm font-medium">
                        {m.weight_value!.toFixed(1)} {m.weight_unit ?? 'kg'}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* Tab content: Body Fat + Lean Mass                                 */}
        {/* ================================================================= */}
        {activeTab === 'body_fat' && (
          <>
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              BODY COMPOSITION
            </Text>
            <View className="flex-row gap-2 mb-card-gap">
              {/* Body Fat */}
              <View className="flex-1 bg-card rounded-card p-card-pad">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                  Body Fat
                </Text>
                <Text className="text-primary text-hero-num font-medium">
                  {currentBodyFat !== null ? `${currentBodyFat.toFixed(1)}%` : '\u2014'}
                </Text>
                {bodyFatDelta && (
                  <Text
                    className="text-body-sm mt-1"
                    style={{ color: bodyFatDelta.isPositive ? Colors.coral : Colors.positive }}
                  >
                    {bodyFatDelta.text}% vs prev
                  </Text>
                )}
              </View>
              {/* Lean Mass */}
              <View className="flex-1 bg-card rounded-card p-card-pad">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                  Lean Mass
                </Text>
                <Text className="text-primary text-hero-num font-medium">
                  {currentLeanMass !== null ? `${currentLeanMass.toFixed(1)}` : '\u2014'}
                </Text>
                <Text className="text-ambient text-label-xs">
                  {currentLeanMass !== null ? 'kg' : ''}
                </Text>
                {leanMassDelta && (
                  <Text
                    className="text-body-sm mt-1"
                    style={{ color: leanMassDelta.isPositive ? Colors.positive : Colors.coral }}
                  >
                    {leanMassDelta.text} kg vs prev
                  </Text>
                )}
              </View>
            </View>

            {/* Body fat history */}
            {measurements.filter((m) => m.body_fat_percent !== null).length > 0 && (
              <View className="bg-card rounded-card p-card-pad mb-card-gap">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-3">
                  BODY FAT HISTORY
                </Text>
                {measurements
                  .filter((m) => m.body_fat_percent !== null)
                  .slice(0, 10)
                  .map((m, idx) => (
                    <View
                      key={m.id}
                      className={`flex-row items-center justify-between py-2 ${
                        idx > 0 ? 'border-t-[0.5px] border-border-subtle' : ''
                      }`}
                    >
                      <Text className="text-ambient text-body-sm">
                        {formatDate(m.recorded_at)}
                      </Text>
                      <Text className="text-primary text-body-sm font-medium">
                        {m.body_fat_percent!.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* Tab content: Circumference Measurements                           */}
        {/* ================================================================= */}
        {activeTab === 'measurements' && (
          <>
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              CIRCUMFERENCE
            </Text>
            {latestCirc.length === 0 ? (
              <View className="bg-card rounded-card p-card-pad mb-card-gap items-center py-6">
                <Text className="text-ambient text-body-sm text-center">
                  Log your first circumference measurement below.
                </Text>
              </View>
            ) : (
              <View className="bg-card rounded-card p-card-pad mb-card-gap">
                {latestCirc.map((row, idx) => {
                  const prev = previousCircMap.get(row.site);
                  const delta = prev !== undefined ? formatDelta(row.value_cm, prev) : null;
                  const siteLabel = (row.custom_label ?? row.site).charAt(0).toUpperCase()
                    + (row.custom_label ?? row.site).slice(1);

                  return (
                    <View
                      key={row.id}
                      className={`flex-row items-center justify-between py-3 ${
                        idx > 0 ? 'border-t-[0.5px] border-border-subtle' : ''
                      }`}
                    >
                      <Text className="text-primary text-body-sm">{siteLabel}</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-primary text-body-sm font-medium">
                          {row.value_cm.toFixed(1)} cm
                        </Text>
                        {delta && (
                          <Text
                            className="text-[10px]"
                            style={{ color: delta.isPositive ? Colors.label : Colors.label }}
                          >
                            {delta.text}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Inline circumference form */}
            <View className="bg-card rounded-card p-card-pad mb-card-gap">
              <Text className="text-label text-label-xs uppercase tracking-widest mb-3">
                LOG CIRCUMFERENCE
              </Text>
              {/* Site selector */}
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                {CIRCUMFERENCE_SITES.map((site) => (
                  <Pressable
                    key={site}
                    onPress={() => setFormSite(site)}
                    className={`rounded-pill px-3 py-1.5 ${
                      formSite === site ? 'bg-accent' : 'bg-stat-tile'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: formSite === site }}
                    accessibilityLabel={`Select ${site}`}
                  >
                    <Text
                      className={`text-body-sm ${
                        formSite === site ? 'text-accent-text font-medium' : 'text-label'
                      }`}
                    >
                      {site.charAt(0).toUpperCase() + site.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-stat-tile text-primary text-body-sm rounded-btn-sm px-3 py-2"
                  placeholder="Value (cm)"
                  placeholderTextColor={Colors.ambient}
                  keyboardType="decimal-pad"
                  value={formCircValue}
                  onChangeText={setFormCircValue}
                  accessibilityLabel={`${formSite} measurement in centimeters`}
                />
                <Pressable
                  onPress={handleLogCircumference}
                  className="bg-accent rounded-btn-sm px-4 py-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Save ${formSite} measurement`}
                >
                  <Text className="text-accent-text text-body-sm font-medium">Save</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* ================================================================= */}
        {/* Mandatory health disclaimer                                       */}
        {/* ================================================================= */}
        <View
          className="bg-card rounded-card p-card-pad mb-card-gap border-[0.5px] border-border-subtle"
          accessibilityRole="text"
          accessibilityLabel="Health disclaimer"
        >
          <Text className="text-ambient text-[11px] leading-4">
            For personal fitness tracking only. Not a medical assessment. Body
            composition measurements are estimates and should not be used for
            medical diagnosis. Consult a healthcare professional for medical advice.
          </Text>
        </View>

        {/* ================================================================= */}
        {/* Inline weight/body fat log form                                   */}
        {/* ================================================================= */}
        {showLogForm && (
          <View className="bg-hero rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle font-medium mb-3">
              Log Measurement
            </Text>
            <View className="mb-3">
              <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                Body Weight (kg)
              </Text>
              <TextInput
                className="bg-stat-tile text-primary text-body-sm rounded-btn-sm px-3 py-2"
                placeholder="e.g. 82.5"
                placeholderTextColor={Colors.ambient}
                keyboardType="decimal-pad"
                value={formWeight}
                onChangeText={setFormWeight}
                accessibilityLabel="Body weight in kilograms"
                autoFocus
              />
            </View>
            <View className="mb-4">
              <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
                Body Fat % (optional)
              </Text>
              <TextInput
                className="bg-stat-tile text-primary text-body-sm rounded-btn-sm px-3 py-2"
                placeholder="e.g. 14.2"
                placeholderTextColor={Colors.ambient}
                keyboardType="decimal-pad"
                value={formBodyFat}
                onChangeText={setFormBodyFat}
                accessibilityLabel="Body fat percentage"
              />
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShowLogForm(false)}
                className="flex-1 bg-stat-tile rounded-btn min-h-btn items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-label text-body-sm">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLogWeight}
                className="flex-1 bg-accent rounded-btn min-h-btn items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Save body weight measurement"
              >
                <Text className="text-accent-text text-body-sm font-medium">Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Log measurement CTA (shown when form is not visible) */}
        {!showLogForm && (
          <Pressable
            onPress={() => setShowLogForm(true)}
            className="bg-accent rounded-btn min-h-btn items-center justify-center mb-8 flex-row gap-2"
            accessibilityRole="button"
            accessibilityLabel="Log a body measurement"
          >
            <IconPlus size={16} color={Colors.accentText} />
            <Text className="text-accent-text text-subtitle font-medium">Log measurement</Text>
          </Pressable>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
