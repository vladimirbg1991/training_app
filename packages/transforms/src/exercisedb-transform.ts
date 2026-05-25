import { z } from 'zod';

import {
  BODY_PART_MAP,
  EQUIPMENT_MAP,
  MUSCLE_NAME_MAP,
  TARGET_MUSCLE_MAP,
} from './exercisedb-maps.js';

// ============================================================================
// Raw API response schemas (Zod)
// ============================================================================

/** Schema for a single exercise from ExerciseDB OSS or V2 API. */
const ExerciseDBRawSchema = z.object({
  // --- OSS fields (always present) ---
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  bodyParts: z.array(z.string()),
  equipments: z.array(z.string()),
  targetMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  gifUrl: z.string(),
  instructions: z.array(z.string()),

  // --- V2-only fields (optional) ---
  exerciseType: z.string().optional(),
  overview: z.string().optional(),
  exerciseTips: z.array(z.string()).optional(),
  variations: z.array(z.string()).optional(),
  relatedExerciseIds: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z
    .object({
      '360': z.string(),
      '480': z.string(),
      '720': z.string(),
      '1080': z.string(),
    })
    .optional(),
  keywords: z.array(z.string()).optional(),
});

type ExerciseDBRaw = z.infer<typeof ExerciseDBRawSchema>;

// ============================================================================
// Transform output type
// ============================================================================

export interface TransformedExercise {
  name: string;
  instructions: string | null;
  bodyPart: string | null;
  targetMuscle: string | null;
  secondaryMuscles: string[];
  equipmentKey: string;
  rawEquipment: string;
  isCustom: false;
  createdBy: null;
  externalId: string;
  gifUrl: string | null;
  // V2-only fields (null from OSS)
  exerciseType: string | null;
  overview: string | null;
  exerciseTips: string[] | null;
  variations: string[] | null;
  relatedExerciseIds: string[] | null;
  videoUrl: string | null;
  imageUrls: {
    '360': string;
    '480': string;
    '720': string;
    '1080': string;
  } | null;
  keywords: string[] | null;
}

export interface TransformFailure {
  index: number;
  raw: unknown;
  error: string;
}

export interface BatchTransformResult {
  successes: TransformedExercise[];
  failures: TransformFailure[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Title-case a string: capitalize the first letter of every word.
 * "barbell bench press" → "Barbell Bench Press"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

/**
 * Strip "Step:N " or "Step: N " prefixes from individual instruction lines.
 */
function stripStepPrefix(instruction: string): string {
  return instruction.replace(/^Step:\s*\d+\s*/i, '').trim();
}

/**
 * Look up a value in a map by its lowercase key.
 * Returns the mapped value, or the original value if no mapping exists.
 */
function mapValue(map: Record<string, string>, raw: string): string {
  const key = raw.toLowerCase().trim();
  return map[key] ?? raw;
}

// ============================================================================
// Single-exercise transform
// ============================================================================

/**
 * Transform a validated ExerciseDB record into the app's domain shape.
 */
function transformParsed(raw: ExerciseDBRaw): TransformedExercise {
  // Name: title-case
  const name = toTitleCase(raw.name);

  // Instructions: strip step prefixes, join with newline, null if empty
  const instructions =
    raw.instructions.length > 0
      ? raw.instructions.map(stripStepPrefix).join('\n')
      : null;

  // Body part: use first entry from bodyParts array, map it
  const rawBodyPart = raw.bodyParts[0];
  const bodyPart =
    rawBodyPart !== undefined ? mapValue(BODY_PART_MAP, rawBodyPart) : null;

  // Target muscle: use first entry from targetMuscles array, map it
  const rawTarget = raw.targetMuscles[0];
  const targetMuscle =
    rawTarget !== undefined ? mapValue(TARGET_MUSCLE_MAP, rawTarget) : null;

  // Secondary muscles: map each, deduplicate via Set
  const mappedSecondary = raw.secondaryMuscles.map((m) =>
    mapValue(MUSCLE_NAME_MAP, m),
  );
  const secondaryMuscles = [...new Set(mappedSecondary)].filter(
    (m) => m !== targetMuscle,
  );

  // Equipment: use first entry from equipments array, map it
  const rawEquipment = raw.equipments[0] ?? 'body weight';
  const equipmentKey = mapValue(EQUIPMENT_MAP, rawEquipment);

  // GIF URL: null if empty string
  const gifUrl = raw.gifUrl || null;

  return {
    name,
    instructions,
    bodyPart,
    targetMuscle,
    secondaryMuscles,
    equipmentKey,
    rawEquipment,
    isCustom: false,
    createdBy: null,
    externalId: raw.exerciseId,
    gifUrl,
    // V2-only fields — null when absent
    exerciseType: raw.exerciseType ?? null,
    overview: raw.overview ?? null,
    exerciseTips: raw.exerciseTips ?? null,
    variations: raw.variations ?? null,
    relatedExerciseIds: raw.relatedExerciseIds ?? null,
    videoUrl: raw.videoUrl ?? null,
    imageUrls: raw.imageUrls ?? null,
    keywords: raw.keywords ?? null,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Transform a single raw ExerciseDB API response object.
 * Parses with Zod, maps values, and returns the domain shape.
 *
 * @throws {z.ZodError} if the input fails schema validation.
 */
export function transformExercise(raw: unknown): TransformedExercise {
  const parsed = ExerciseDBRawSchema.parse(raw);
  return transformParsed(parsed);
}

/**
 * Safely transform a single exercise, returning a discriminated result.
 */
export function transformExerciseSafe(
  raw: unknown,
): { ok: true; data: TransformedExercise } | { ok: false; error: string } {
  const result = ExerciseDBRawSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  try {
    return { ok: true, data: transformParsed(result.data) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Transform an array of raw ExerciseDB exercises.
 * Never throws — collects failures separately.
 */
export function transformExerciseBatch(
  rawItems: unknown[],
): BatchTransformResult {
  const successes: TransformedExercise[] = [];
  const failures: TransformFailure[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const result = transformExerciseSafe(item);
    if (result.ok) {
      successes.push(result.data);
    } else {
      failures.push({ index: i, raw: item, error: result.error });
    }
  }

  return { successes, failures };
}

// Re-export the raw schema for consumers that need to validate externally
export { ExerciseDBRawSchema };
