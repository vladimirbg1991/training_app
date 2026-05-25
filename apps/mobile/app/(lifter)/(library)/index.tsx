import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Keyboard } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { IconSearch, IconPlus } from '@tabler/icons-react-native';
import { useQuery } from '@powersync/react-native';
import { Colors } from '@/constants/colors';
import { MUSCLE_GROUPS, type MuscleGroup } from '@gym-app/domain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseRow {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  secondary_muscles: string | null;
  equipment_id: string | null;
  is_custom: number;
  created_by: string | null;
  external_id: string | null;
}

// ---------------------------------------------------------------------------
// Body-part mapping: UI muscle groups -> seed data body_part values
// ---------------------------------------------------------------------------

const BODY_PART_MAP: Record<MuscleGroup, string[]> = {
  chest: ['chest'],
  back: ['back'],
  legs: ['upper legs', 'lower legs'],
  shoulders: ['shoulders'],
  arms: ['upper arms', 'lower arms'],
  core: ['core'],
};

/** All body_part values that belong to any known muscle group. */
const ALL_BODY_PARTS = Object.values(BODY_PART_MAP).flat();

// ---------------------------------------------------------------------------
// Filter chip state
// ---------------------------------------------------------------------------

const FILTER_CHIPS = ['All', ...MUSCLE_GROUPS] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

// ---------------------------------------------------------------------------
// Consolidated query hook
// ---------------------------------------------------------------------------

function useFilteredExercises(search: string, bodyParts: string[]) {
  let sql = 'SELECT * FROM exercises WHERE 1=1';
  const params: string[] = [];

  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  if (bodyParts.length > 0) {
    const placeholders = bodyParts.map(() => '?').join(', ');
    sql += ` AND body_part IN (${placeholders})`;
    params.push(...bodyParts);
  }

  sql += ' ORDER BY name ASC';

  return useQuery<ExerciseRow>(sql, params);
}

// ---------------------------------------------------------------------------
// Muscle-group count hook (all exercises, grouped by body_part)
// ---------------------------------------------------------------------------

function useMuscleGroupCounts() {
  const { data } = useQuery<{ body_part: string; cnt: number }>(
    `SELECT body_part, COUNT(*) AS cnt
     FROM exercises
     WHERE body_part IN (${ALL_BODY_PARTS.map(() => '?').join(', ')})
     GROUP BY body_part`,
    ALL_BODY_PARTS,
  );

  return useMemo(() => {
    const raw = data ?? [];
    const counts: Record<MuscleGroup, number> = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
    };

    for (const row of raw) {
      for (const group of MUSCLE_GROUPS) {
        if (BODY_PART_MAP[group].includes(row.body_part)) {
          counts[group] += row.cnt;
        }
      }
    }

    return counts;
  }, [data]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExerciseLibraryScreen(): React.JSX.Element {
  const router = useRouter();

  // Search with debounce
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Filter chips
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');

  // Derive selected body_parts for the consolidated query
  const selectedBodyParts = useMemo<string[]>(() => {
    if (activeFilter === 'All') return [];
    return BODY_PART_MAP[activeFilter] ?? [];
  }, [activeFilter]);

  // Single consolidated query
  const { data: exercises } = useFilteredExercises(debouncedSearch, selectedBodyParts);
  const exerciseList: ExerciseRow[] = exercises ?? [];

  // Counts for the browse-by-muscle cards
  const muscleGroupCounts = useMuscleGroupCounts();

  // Show "browse by muscle" only when no search and "All" selected
  const showBrowse = !debouncedSearch && activeFilter === 'All';

  // -------------------------------------------------------------------
  // FlashList renderItem
  // -------------------------------------------------------------------

  const renderExerciseRow = useCallback(
    ({ item }: ListRenderItemInfo<ExerciseRow>) => (
      <View className="px-4">
        <Link
          href={{
            pathname: '/(lifter)/(library)/[exerciseId]',
            params: { exerciseId: item.id },
          }}
          asChild
        >
          <Pressable
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.target_muscle ?? 'unknown'}`}
          >
            <View className="w-10 h-10 rounded-btn-sm bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-label-xs">
                {(item.body_part ?? '?')[0]?.toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">{item.name}</Text>
              <Text className="text-label text-body-sm mt-0.5">
                {item.target_muscle ?? 'Unknown'}
                {item.body_part ? ` \u00b7 ${item.body_part}` : ''}
              </Text>
            </View>
            <Text className="text-ambient text-body-sm">{'\u2192'}</Text>
          </Pressable>
        </Link>
      </View>
    ),
    [],
  );

  // -------------------------------------------------------------------
  // FlashList ListHeaderComponent
  // -------------------------------------------------------------------

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 mb-4">
          <Text
            className="text-primary text-title"
            accessibilityRole="header"
          >
            Library
          </Text>
          <Pressable
            onPress={() => router.push('/(modals)/create-exercise')}
            className="w-11 h-11 rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Create custom exercise"
          >
            <IconPlus size={18} color={Colors.label} />
          </Pressable>
        </View>

        {/* Search */}
        <View className="mx-4 mb-3">
          <View className="flex-row items-center bg-card rounded-card border-[0.5px] border-border-subtle px-3 h-11">
            <IconSearch size={16} color={Colors.label} />
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.label}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
              className="flex-1 ml-2 text-primary text-body-sm"
              accessibilityLabel="Search exercises"
            />
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        >
          {FILTER_CHIPS.map((chip) => {
            const isActive = chip === activeFilter;
            return (
              <Pressable
                key={chip}
                onPress={() => setActiveFilter(chip)}
                className={`px-3 py-2.5 rounded-pill min-h-tap justify-center ${
                  isActive
                    ? 'bg-accent'
                    : 'bg-card border-[0.5px] border-border-subtle'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter by ${chip}`}
              >
                <Text
                  className={`text-body-sm capitalize ${
                    isActive ? 'text-accent-text font-medium' : 'text-ambient'
                  }`}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Browse by muscle group */}
        {showBrowse && (
          <View className="px-4 mb-4">
            <Text
              className="text-label text-label-xs uppercase tracking-widest mb-2"
              accessibilityRole="header"
            >
              BROWSE BY MUSCLE
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MUSCLE_GROUPS.map((group) => (
                <Pressable
                  key={group}
                  onPress={() => setActiveFilter(group)}
                  className="bg-card rounded-card p-3 border-[0.5px] border-border-subtle w-[48%]"
                  accessibilityRole="button"
                  accessibilityLabel={`Browse ${group} exercises`}
                >
                  <Text className="text-primary text-subtitle capitalize">
                    {group}
                  </Text>
                  <Text className="text-label text-label-xs mt-1">
                    {muscleGroupCounts[group]} exercises
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Section label for exercise list */}
        {!showBrowse && (
          <View className="px-4">
            <Text
              className="text-label text-label-xs uppercase tracking-widest mb-2"
              accessibilityRole="header"
            >
              {debouncedSearch ? 'SEARCH RESULTS' : activeFilter.toUpperCase()}{' '}
              {'\u00b7'} {exerciseList.length}
            </Text>
          </View>
        )}
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputValue,
      activeFilter,
      showBrowse,
      debouncedSearch,
      muscleGroupCounts,
      exerciseList.length,
      router,
    ],
  );

  // -------------------------------------------------------------------
  // FlashList ListEmptyComponent
  // -------------------------------------------------------------------

  const ListEmpty = useMemo(
    () => (
      <View className="items-center py-8 px-4">
        <Text className="text-ambient text-body-sm">
          {debouncedSearch
            ? `No exercises found for "${debouncedSearch}"`
            : 'No exercises in this category'}
        </Text>
      </View>
    ),
    [debouncedSearch],
  );

  // -------------------------------------------------------------------
  // FlashList ListFooterComponent — bottom padding
  // -------------------------------------------------------------------

  const ListFooter = useMemo(() => <View className="h-8" />, []);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlashList<ExerciseRow>
        data={exerciseList}
        renderItem={renderExerciseRow}
        keyExtractor={keyExtractor}
        estimatedItemSize={72}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keyExtractor(item: ExerciseRow): string {
  return item.id;
}
