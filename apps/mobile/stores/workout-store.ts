/**
 * Zustand workout store — the most critical runtime state in the app.
 *
 * This store powers the "never lose a set" guarantee. Every set confirmation
 * follows a strict sequence: SQLite write -> haptic -> state update -> MMKV
 * snapshot (via subscription). The UI never sees a confirmed set that has not
 * already been persisted to SQLite.
 *
 * Architecture:
 *   - Zustand v5 with subscribeWithSelector middleware (no immer, no persist)
 *   - MMKV snapshot fires automatically via store.subscribe() after creation
 *   - PowerSync database injected via setWorkoutStoreDatabase() at app init
 *   - All SQLite writes go through PowerSync's tracked execute() so they
 *     enter the upload queue for server sync automatically
 *
 * The store is intentionally large because the workout loop is the core
 * product experience. Splitting it into slices would scatter the critical
 * path across files and make the confirm-set order harder to audit.
 */

import { createStore, useStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as Haptics from 'expo-haptics';
import type { AbstractPowerSyncDatabase } from '@powersync/react-native';
import type { WeightUnit } from '@gym-app/domain';

import { saveSnapshot, loadSnapshot, clearSnapshot } from './mmkv';

// ============================================================================
// PowerSync database injection
// ============================================================================

let _db: AbstractPowerSyncDatabase | null = null;

/**
 * Inject the PowerSync database instance into the workout store.
 * Must be called once from the PowerSync provider after db.init() completes.
 * Without this, confirmSet() and other write actions will throw.
 */
export function setWorkoutStoreDatabase(db: AbstractPowerSyncDatabase): void {
  _db = db;
}

function getDb(): AbstractPowerSyncDatabase {
  if (!_db) {
    throw new Error(
      'PowerSync database not initialized for workout store. ' +
        'Call setWorkoutStoreDatabase(db) from the PowerSync provider.',
    );
  }
  return _db;
}

// ============================================================================
// Store types
// ============================================================================

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  equipmentCategory: string | null;
  gymEquipmentInstanceId: string | null;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  weightIncrement: number;
  incrementUnit: 'kg' | 'lb' | 'pin';
}

export interface ConfirmedSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  weightValue: number | null;
  weightUnit: WeightUnit;
  reps: number | null;
  pinPosition: number | null;
  isWarmup: boolean;
  isPersonalRecord: boolean;
  performedAt: string; // ISO 8601
}

export interface DraftSet {
  exerciseId: string;
  weightValue: number | null;
  weightUnit: WeightUnit;
  reps: number | null;
  pinPosition: number | null;
  isWarmup: boolean;
  isDirty: boolean; // true after any user adjustment
  sourceSetIndex: number;
  bodyweightAtTime: number | null;
  bodyweightUnit: 'kg' | 'lb' | null;
}

export interface DiscardedDraft extends DraftSet {
  discardedAt: number;
  exerciseIndex: number;
}

export interface RestTimerState {
  isActive: boolean;
  startedAt: number | null; // Date.now()
  targetSeconds: number;
  label: string;
}

export type WorkoutStatus = 'idle' | 'active' | 'completing' | 'completed';

// ============================================================================
// Store shape
// ============================================================================

interface WorkoutState {
  // Session
  sessionId: string | null;
  startedAt: number | null;
  routineId: string | null;
  gymId: string | null;
  status: WorkoutStatus;

  // Exercises
  exercises: WorkoutExercise[];
  currentExerciseIndex: number;

  // Confirmed sets (keyed by exerciseId for O(1) UI reads)
  confirmedSets: Record<string, ConfirmedSet[]>;

  // Draft (ephemeral — never in SQLite, only in MMKV snapshot)
  draft: DraftSet | null;

  // Undo ring buffer (max 5 items, max 5 minutes old)
  discardedDrafts: DiscardedDraft[];

  // Rest timer
  restTimer: RestTimerState;

  // Post-workout summary
  subjectiveEffort: number | null; // 1-4
  totalVolume: number;
  totalSets: number;
  durationSeconds: number;
  detectedPRs: Array<{
    exerciseId: string;
    exerciseName: string;
    description: string;
  }>;
}

// ============================================================================
// Store actions
// ============================================================================

interface WorkoutActions {
  // Session lifecycle
  startWorkout: (params: {
    userId: string;
    routineId?: string;
    gymId?: string;
    exercises?: WorkoutExercise[];
  }) => Promise<void>;
  abandonWorkout: (userId: string) => Promise<void>;
  /** Transition to completing state (shows summary UI). Does NOT write to SQLite yet. */
  beginFinish: () => void;
  /** Save the completed workout to SQLite with optional effort rating. */
  saveWorkout: (userId: string, effort?: number) => Promise<void>;

  // Exercise management
  addExercise: (exercise: WorkoutExercise) => void;
  removeExercise: (index: number) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;

  // Set logging (critical path)
  initDraft: (prefill?: {
    weightValue: number | null;
    weightUnit: WeightUnit;
    reps: number | null;
  }) => void;
  updateDraft: (partial: Partial<DraftSet>) => void;
  confirmSet: (userId: string) => Promise<void>;
  discardDraft: () => void;
  undoDiscard: () => void;

  // Rest timer
  startRestTimer: (seconds: number, label: string) => void;
  skipRest: () => void;
  extendRest: (additionalSeconds: number) => void;

  // Restore from crash/background kill
  restoreFromSnapshot: (userId: string) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Initial state factory
// ============================================================================

const REST_TIMER_INITIAL: RestTimerState = {
  isActive: false,
  startedAt: null,
  targetSeconds: 0,
  label: '',
};

function createInitialState(): WorkoutState {
  return {
    sessionId: null,
    startedAt: null,
    routineId: null,
    gymId: null,
    status: 'idle',
    exercises: [],
    currentExerciseIndex: 0,
    confirmedSets: {},
    draft: null,
    discardedDrafts: [],
    restTimer: REST_TIMER_INITIAL,
    subjectiveEffort: null,
    totalVolume: 0,
    totalSets: 0,
    durationSeconds: 0,
    detectedPRs: [],
  };
}

// ============================================================================
// Constants
// ============================================================================

const KG_PER_LB = 0.45359237;
function toKg(value: number, unit: string): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

const MAX_UNDO_BUFFER_SIZE = 5;
const MAX_UNDO_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Store implementation
// ============================================================================

export const workoutStore = createStore<WorkoutState & WorkoutActions>()(
  subscribeWithSelector((set, get) => ({
    // --- Initial state ---
    ...createInitialState(),

    // ========================================================================
    // Session lifecycle
    // ========================================================================

    startWorkout: async (params) => {
      const db = getDb();
      const sessionId = crypto.randomUUID();
      const now = Date.now();
      const startedAtIso = new Date(now).toISOString();

      await db.execute(
        `INSERT INTO workout_sessions (id, user_id, routine_id, gym_id, status, started_at, entry_source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'in_progress', ?, 'manual', ?, ?)`,
        [
          sessionId,
          params.userId,
          params.routineId ?? null,
          params.gymId ?? null,
          startedAtIso,
          startedAtIso,
          startedAtIso,
        ],
      );

      set({
        sessionId,
        startedAt: now,
        routineId: params.routineId ?? null,
        gymId: params.gymId ?? null,
        status: 'active',
        exercises: params.exercises ?? [],
        currentExerciseIndex: 0,
        confirmedSets: {},
        draft: null,
        discardedDrafts: [],
        restTimer: REST_TIMER_INITIAL,
        subjectiveEffort: null,
        totalVolume: 0,
        totalSets: 0,
        durationSeconds: 0,
        detectedPRs: [],
      });
    },

    abandonWorkout: async (userId) => {
      const { sessionId, status } = get();
      if (status !== 'active' || !sessionId) return;

      const db = getDb();
      const now = new Date().toISOString();

      await db.execute(
        `UPDATE workout_sessions SET status = 'abandoned', completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        [now, now, sessionId, userId],
      );

      clearSnapshot();
      set(createInitialState());
    },

    /**
     * Transition to the post-workout summary screen.
     * Computes volume/sets but does NOT write to SQLite yet.
     * The actual save happens in saveWorkout() after the user selects effort.
     */
    beginFinish: () => {
      const state = get();
      if (state.status !== 'active' || !state.sessionId) return;

      // Discard any dirty draft
      if (state.draft?.isDirty) {
        get().discardDraft();
      }

      // Compute summary stats (normalize all volume to kg for internal tracking)
      let totalVolume = 0;
      let totalSets = 0;
      for (const sets of Object.values(state.confirmedSets)) {
        for (const s of sets) {
          if (!s.isWarmup) {
            totalSets += 1;
            if (s.weightValue !== null && s.reps !== null) {
              totalVolume += toKg(s.weightValue, s.weightUnit) * s.reps;
            }
          }
        }
      }

      const durationSeconds = state.startedAt
        ? Math.round((Date.now() - state.startedAt) / 1000)
        : 0;

      set({
        status: 'completing',
        totalVolume,
        totalSets,
        durationSeconds,
        restTimer: REST_TIMER_INITIAL,
        draft: null,
      });
    },

    /**
     * Persist the completed workout to SQLite with optional effort rating.
     * Called from the post-workout summary screen after the user selects effort.
     */
    saveWorkout: async (userId, effort) => {
      const state = get();
      if (state.status !== 'completing' || !state.sessionId) return;

      const db = getDb();
      const now = new Date().toISOString();

      await db.execute(
        `UPDATE workout_sessions
         SET status = 'completed',
             completed_at = ?,
             duration_seconds = ?,
             subjective_effort = ?,
             updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [now, state.durationSeconds, effort ?? null, now, state.sessionId, userId],
      );

      clearSnapshot();

      set({
        status: 'completed',
        subjectiveEffort: effort ?? null,
      });
    },

    // ========================================================================
    // Exercise management
    // ========================================================================

    addExercise: (exercise) => {
      set((state) => ({
        exercises: [...state.exercises, exercise],
      }));
    },

    removeExercise: (index) => {
      set((state) => {
        const exercises = state.exercises.filter((_, i) => i !== index);
        // Adjust currentExerciseIndex if needed
        let newIndex = state.currentExerciseIndex;
        if (newIndex >= exercises.length) {
          newIndex = Math.max(0, exercises.length - 1);
        } else if (index < newIndex) {
          newIndex -= 1;
        }
        return {
          exercises,
          currentExerciseIndex: newIndex,
        };
      });
    },

    reorderExercises: (fromIndex, toIndex) => {
      set((state) => {
        const exercises = [...state.exercises];
        const [moved] = exercises.splice(fromIndex, 1);
        if (!moved) return state;
        exercises.splice(toIndex, 0, moved);

        // Track current exercise identity, not position
        let newIndex = state.currentExerciseIndex;
        if (state.currentExerciseIndex === fromIndex) {
          newIndex = toIndex;
        } else if (
          fromIndex < state.currentExerciseIndex &&
          toIndex >= state.currentExerciseIndex
        ) {
          newIndex -= 1;
        } else if (
          fromIndex > state.currentExerciseIndex &&
          toIndex <= state.currentExerciseIndex
        ) {
          newIndex += 1;
        }

        return { exercises, currentExerciseIndex: newIndex };
      });
    },

    nextExercise: () => {
      const state = get();
      if (state.currentExerciseIndex >= state.exercises.length - 1) return;

      // Implicit discard: if a dirty draft exists, push it to the undo buffer
      if (state.draft && state.draft.isDirty) {
        get().discardDraft();
      } else {
        set({ draft: null });
      }

      set((s) => ({
        currentExerciseIndex: s.currentExerciseIndex + 1,
      }));
    },

    previousExercise: () => {
      const state = get();
      if (state.currentExerciseIndex <= 0) return;

      // Implicit discard: if a dirty draft exists, push it to the undo buffer
      if (state.draft && state.draft.isDirty) {
        get().discardDraft();
      } else {
        set({ draft: null });
      }

      set((s) => ({
        currentExerciseIndex: s.currentExerciseIndex - 1,
      }));
    },

    // ========================================================================
    // Set logging — THE CRITICAL PATH
    // ========================================================================

    initDraft: (prefill) => {
      const state = get();
      const exercise = state.exercises[state.currentExerciseIndex];
      if (!exercise) return;

      const existingSets = state.confirmedSets[exercise.exerciseId] ?? [];
      const setIndex = existingSets.length;

      set({
        draft: {
          exerciseId: exercise.exerciseId,
          weightValue: prefill?.weightValue ?? null,
          weightUnit: prefill?.weightUnit ?? 'kg',
          reps: prefill?.reps ?? null,
          pinPosition: null,
          isWarmup: false,
          isDirty: false,
          sourceSetIndex: setIndex,
          bodyweightAtTime: null,
          bodyweightUnit: null,
        },
      });
    },

    updateDraft: (partial) => {
      set((state) => {
        if (!state.draft) return state;
        return {
          draft: { ...state.draft, ...partial, isDirty: true },
        };
      });
    },

    /**
     * confirmSet — the most important function in the entire app.
     *
     * Execution order is NON-NEGOTIABLE:
     *   1. Generate UUID
     *   2. Write to SQLite via PowerSync (synchronous from the app's perspective)
     *   3. Update session timestamp
     *   4. Fire haptic feedback
     *   5. Update Zustand state (confirmedSets, clear draft, start rest timer)
     *   6. MMKV snapshot fires automatically via subscription
     *
     * This order guarantees that if the app is killed at ANY point after step 2,
     * the set is recoverable from SQLite. The MMKV snapshot (step 6) is a bonus
     * that speeds up recovery but is not the source of truth.
     */
    confirmSet: async (userId) => {
      const state = get();
      const { draft, sessionId } = state;
      if (!draft || !sessionId) return;

      const exercise = state.exercises[state.currentExerciseIndex];
      if (!exercise) return;

      const db = getDb();
      const setId = crypto.randomUUID();
      const now = new Date().toISOString();

      const existingSets = state.confirmedSets[draft.exerciseId] ?? [];
      const setIndex = existingSets.length;

      // Step 1-3: SQLite writes in a single transaction
      await db.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO workout_sets (
            id, session_id, exercise_id, user_id, set_index,
            weight_value, weight_unit, reps, pin_position,
            is_warmup, is_personal_record, performed_at,
            gym_equipment_instance_id, sync_source,
            bodyweight_at_time, bodyweight_unit,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'app', ?, ?, ?, ?)`,
          [
            setId,
            sessionId,
            draft.exerciseId,
            userId,
            setIndex,
            draft.weightValue,
            draft.weightUnit,
            draft.reps,
            draft.pinPosition,
            draft.isWarmup ? 1 : 0,
            0, // isPersonalRecord — computed in saveWorkout() or server-side
            now,
            exercise.gymEquipmentInstanceId,
            draft.bodyweightAtTime,
            draft.bodyweightUnit,
            now,
            now,
          ],
        );

        await tx.execute(
          `UPDATE workout_sessions SET updated_at = ? WHERE id = ? AND user_id = ?`,
          [now, sessionId, userId],
        );
      });

      // Step 4: Haptic feedback — fire and forget (must not block state update)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Step 5: Update Zustand state
      const confirmedSet: ConfirmedSet = {
        id: setId,
        exerciseId: draft.exerciseId,
        setIndex,
        weightValue: draft.weightValue,
        weightUnit: draft.weightUnit,
        reps: draft.reps,
        pinPosition: draft.pinPosition,
        isWarmup: draft.isWarmup,
        isPersonalRecord: false, // computed later
        performedAt: now,
      };

      set((s) => {
        const exerciseSets = s.confirmedSets[draft.exerciseId] ?? [];
        return {
          confirmedSets: {
            ...s.confirmedSets,
            [draft.exerciseId]: [...exerciseSets, confirmedSet],
          },
          draft: null,
          // Auto-start rest timer for working (non-warmup) sets
          restTimer: draft.isWarmup
            ? s.restTimer
            : {
                isActive: true,
                startedAt: Date.now(),
                targetSeconds: exercise.restSeconds,
                label: exercise.exerciseName,
              },
        };
      });

      // Step 6: Flush MMKV snapshot immediately (don't wait for debounce)
      flushWorkoutSnapshot();
    },

    discardDraft: () => {
      set((state) => {
        if (!state.draft) return state;

        const discarded: DiscardedDraft = {
          ...state.draft,
          discardedAt: Date.now(),
          exerciseIndex: state.currentExerciseIndex,
        };

        // Ring buffer: keep newest MAX_UNDO_BUFFER_SIZE items
        const buffer = [discarded, ...state.discardedDrafts].slice(
          0,
          MAX_UNDO_BUFFER_SIZE,
        );

        return {
          draft: null,
          discardedDrafts: buffer,
        };
      });
    },

    undoDiscard: () => {
      set((state) => {
        if (state.discardedDrafts.length === 0) return state;

        const now = Date.now();

        // Find the first discard that is not expired
        const validIndex = state.discardedDrafts.findIndex(
          (d) => now - d.discardedAt < MAX_UNDO_AGE_MS,
        );

        if (validIndex === -1) {
          // All expired — clear the buffer
          return { discardedDrafts: [] };
        }

        const restored = state.discardedDrafts[validIndex]!;
        const remaining = state.discardedDrafts.filter(
          (_, i) => i !== validIndex,
        );

        // Reconstruct as a DraftSet (strip DiscardedDraft-only fields)
        const draft: DraftSet = {
          exerciseId: restored.exerciseId,
          weightValue: restored.weightValue,
          weightUnit: restored.weightUnit,
          reps: restored.reps,
          pinPosition: restored.pinPosition,
          isWarmup: restored.isWarmup,
          isDirty: true,
          sourceSetIndex: restored.sourceSetIndex,
          bodyweightAtTime: restored.bodyweightAtTime,
          bodyweightUnit: restored.bodyweightUnit,
        };

        return {
          draft,
          discardedDrafts: remaining,
          // Navigate back to the exercise where the draft was discarded
          currentExerciseIndex: restored.exerciseIndex,
        };
      });
    },

    // ========================================================================
    // Rest timer
    // ========================================================================

    startRestTimer: (seconds, label) => {
      set({
        restTimer: {
          isActive: true,
          startedAt: Date.now(),
          targetSeconds: seconds,
          label,
        },
      });
    },

    skipRest: () => {
      set({ restTimer: REST_TIMER_INITIAL });
    },

    extendRest: (additionalSeconds) => {
      set((state) => ({
        restTimer: {
          ...state.restTimer,
          targetSeconds: state.restTimer.targetSeconds + additionalSeconds,
        },
      }));
    },

    // ========================================================================
    // Crash recovery
    // ========================================================================

    /**
     * Restore workout state from MMKV snapshot after app restart/crash.
     *
     * Recovery strategy:
     *   1. Load snapshot from MMKV
     *   2. Verify the session still exists and is in_progress in SQLite
     *   3. Reconcile confirmedSets from SQLite (source of truth)
     *   4. Hydrate the store with the reconciled state
     *
     * If the session is missing or completed in SQLite, the snapshot is
     * stale (perhaps the user completed the workout on another device).
     * In that case, clear MMKV and stay idle.
     */
    restoreFromSnapshot: async (userId) => {
      const snapshot = loadSnapshot();
      if (!snapshot) return;

      const db = getDb();

      // Verify session exists and is still in_progress
      const sessionRows = await db.getAll<{
        id: string;
        status: string;
      }>(
        `SELECT id, status FROM workout_sessions WHERE id = ? AND user_id = ? AND status = 'in_progress' LIMIT 1`,
        [snapshot.sessionId, userId],
      );

      if (sessionRows.length === 0) {
        // Session no longer valid — clean up and stay idle
        clearSnapshot();
        return;
      }

      // Reconcile confirmedSets from SQLite (the source of truth)
      const sqliteSets = await db.getAll<{
        id: string;
        exercise_id: string;
        set_index: number;
        weight_value: number | null;
        weight_unit: string;
        reps: number | null;
        pin_position: number | null;
        is_warmup: number;
        is_personal_record: number;
        performed_at: string;
      }>(
        `SELECT id, exercise_id, set_index, weight_value, weight_unit,
                reps, pin_position, is_warmup, is_personal_record, performed_at
         FROM workout_sets
         WHERE session_id = ? AND user_id = ?
         ORDER BY set_index ASC`,
        [snapshot.sessionId, userId],
      );

      // Group sets by exerciseId
      const reconciledSets: Record<string, ConfirmedSet[]> = {};
      for (const row of sqliteSets) {
        const exerciseId = row.exercise_id;
        if (!reconciledSets[exerciseId]) {
          reconciledSets[exerciseId] = [];
        }
        reconciledSets[exerciseId].push({
          id: row.id,
          exerciseId: row.exercise_id,
          setIndex: row.set_index,
          weightValue: row.weight_value,
          weightUnit: (row.weight_unit as WeightUnit) || 'kg',
          reps: row.reps,
          pinPosition: row.pin_position,
          isWarmup: row.is_warmup === 1,
          isPersonalRecord: row.is_personal_record === 1,
          performedAt: row.performed_at,
        });
      }

      set({
        sessionId: snapshot.sessionId,
        startedAt: snapshot.startedAt,
        routineId: snapshot.routineId,
        gymId: snapshot.gymId,
        status: 'active',
        exercises: snapshot.exercises,
        currentExerciseIndex: snapshot.currentExerciseIndex,
        confirmedSets: reconciledSets, // SQLite is truth, not MMKV
        draft: snapshot.draft,
        discardedDrafts: snapshot.discardedDrafts,
        restTimer: snapshot.restTimer,
        subjectiveEffort: null,
        totalVolume: 0,
        totalSets: 0,
        durationSeconds: 0,
        detectedPRs: [],
      });
    },

    reset: () => {
      clearSnapshot();
      set(createInitialState());
    },
  })),
);

// ============================================================================
// MMKV snapshot subscription (debounced 500ms, flushed on commits)
// ============================================================================

const SNAPSHOT_DEBOUNCE_MS = 500;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

function flushSnapshot(state: WorkoutState): void {
  if (state.status === 'idle' || state.status === 'completed') return;
  if (!state.sessionId || !state.startedAt) return;

  try {
    saveSnapshot({
      version: 1,
      timestamp: Date.now(),
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      routineId: state.routineId,
      gymId: state.gymId,
      exercises: state.exercises,
      currentExerciseIndex: state.currentExerciseIndex,
      confirmedSets: state.confirmedSets,
      draft: state.draft,
      discardedDrafts: state.discardedDrafts,
      restTimer: state.restTimer,
    });
  } catch {
    // Never let snapshot serialization crash the app
  }
}

/**
 * Force an immediate MMKV snapshot (called from commit boundaries).
 * Use this after confirmSet, startWorkout, beginFinish — any action
 * where data loss risk is high if the app is killed before the debounce fires.
 */
export function flushWorkoutSnapshot(): void {
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  flushSnapshot(workoutStore.getState());
}

workoutStore.subscribe((state) => {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => flushSnapshot(state), SNAPSHOT_DEBOUNCE_MS);
});

// ============================================================================
// React hook — for use in components
// ============================================================================

/**
 * React hook to access the workout store.
 *
 * Usage:
 *   const status = useWorkoutStore((s) => s.status);
 *   const confirmSet = useWorkoutStore((s) => s.confirmSet);
 *
 * Always use a selector for performance — never subscribe to the entire store.
 */
export function useWorkoutStore<T>(selector: (state: WorkoutState & WorkoutActions) => T): T {
  return useStore(workoutStore, selector);
}

// ============================================================================
// Type exports — consumed by components, hooks, and mmkv.ts
// ============================================================================

export type {
  WorkoutExercise,
  ConfirmedSet,
  DraftSet,
  DiscardedDraft,
  RestTimerState,
  WorkoutStatus,
  WorkoutState,
  WorkoutActions,
};
