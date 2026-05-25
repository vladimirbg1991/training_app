/**
 * ExerciseDB → Postgres import script.
 *
 * Usage:
 *   npx tsx scripts/import-exercisedb.ts
 *   npx tsx scripts/import-exercisedb.ts --dry-run
 *
 * Environment variables (loaded from .env):
 *   DATABASE_URL   — Required. Supabase Postgres direct connection string.
 *   EXERCISEDB_API_KEY — Optional. If set, uses V2 RapidAPI; if absent, uses OSS free API.
 */

import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postgres from 'postgres';

import { ExerciseDBClient } from '@gym-app/data-sources';
import {
  transformExerciseBatch,
  EQUIPMENT_CATEGORY_MAP,
} from '@gym-app/transforms';
import type { TransformedExercise } from '@gym-app/transforms';

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// Helpers
// ============================================================================

function loadCore50Ids(): Set<string> {
  const seedPath = resolve(process.cwd(), 'data/exercises/seed-2026.json');
  const raw = readFileSync(seedPath, 'utf-8');
  const seedData = JSON.parse(raw) as {
    exercises: Array<{ external_id?: string }>;
  };
  return new Set(
    seedData.exercises
      .filter((e) => e.external_id)
      .map((e) => e.external_id as string),
  );
}

/**
 * Split an array into chunks of at most `size` elements.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  // ---- Validate env --------------------------------------------------------
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  const apiKey = process.env['EXERCISEDB_API_KEY'] || undefined;

  const mode = apiKey ? 'V2 (RapidAPI)' : 'OSS (free)';
  console.log(`[import] API mode: ${mode}`);
  console.log(`[import] Dry run: ${String(DRY_RUN)}`);

  // ---- Connect to Postgres -------------------------------------------------
  const sql = postgres(databaseUrl, { ssl: true });

  try {
    // ---- Load Core 50 IDs --------------------------------------------------
    const core50Ids = loadCore50Ids();
    console.log(`[import] Loaded ${String(core50Ids.size)} Core 50 external IDs from seed file.`);

    // ---- Core 50 pre-check -------------------------------------------------
    const core50Array = [...core50Ids];
    const [{ count: core50Count }] = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count
      FROM exercises
      WHERE external_id = ANY(${core50Array})
        AND is_custom = false
    `;
    if (Number(core50Count) < core50Ids.size) {
      console.warn(
        `[import] WARNING: Only ${core50Count}/${String(core50Ids.size)} Core 50 exercises found in DB. ` +
          'Run seed.sql first to preserve hand-written data.',
      );
    } else {
      console.log(`[import] Core 50 pre-check passed (${core50Count} found in DB).`);
    }

    // ---- Load existing equipment from DB -----------------------------------
    const equipmentRows = await sql<{ id: string; name: string }[]>`
      SELECT id, name FROM equipment
    `;
    const equipmentMap = new Map<string, string>();
    for (const row of equipmentRows) {
      equipmentMap.set(row.name, row.id);
    }
    console.log(`[import] Loaded ${String(equipmentMap.size)} equipment rows from DB.`);

    // ---- Fetch exercises from ExerciseDB API -------------------------------
    const client = new ExerciseDBClient({ apiKey });
    console.log('[import] Fetching exercises from ExerciseDB...');
    const rawExercises = await client.fetchAllExercises();
    console.log(`[import] Fetched ${String(rawExercises.length)} raw exercises.`);

    // ---- Transform ---------------------------------------------------------
    const { successes, failures } = transformExerciseBatch(rawExercises);
    console.log(
      `[import] Transformed: ${String(successes.length)} successes, ${String(failures.length)} failures.`,
    );

    if (failures.length > 0) {
      console.warn('[import] Transform failures (first 5):');
      for (const f of failures.slice(0, 5)) {
        console.warn(`  [${String(f.index)}] ${f.error}`);
      }
    }

    if (DRY_RUN) {
      console.log('[import] DRY RUN — skipping DB writes.');
      logSummary(successes, core50Ids);
      return;
    }

    // ---- Resolve equipment FKs (create missing equipment) ------------------
    const uniqueEquipmentKeys = new Set(successes.map((e) => e.equipmentKey));
    let newEquipmentCount = 0;

    for (const equipKey of uniqueEquipmentKeys) {
      if (!equipmentMap.has(equipKey)) {
        const category =
          (EQUIPMENT_CATEGORY_MAP as Record<string, string>)[equipKey] ?? 'other';
        console.log(`[import] Creating missing equipment: "${equipKey}" (category: ${category})`);

        const [inserted] = await sql<[{ id: string }]>`
          INSERT INTO equipment (name, category)
          VALUES (${equipKey}, ${category})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        equipmentMap.set(equipKey, inserted.id);
        newEquipmentCount++;
      }
    }

    if (newEquipmentCount > 0) {
      console.log(`[import] Created ${String(newEquipmentCount)} new equipment rows.`);
    }

    // ---- Separate Core 50 vs. non-Core 50 ---------------------------------
    const core50Exercises: TransformedExercise[] = [];
    const catalogExercises: TransformedExercise[] = [];

    for (const ex of successes) {
      if (core50Ids.has(ex.externalId)) {
        core50Exercises.push(ex);
      } else {
        catalogExercises.push(ex);
      }
    }

    console.log(
      `[import] Core 50 from API: ${String(core50Exercises.length)}, Catalog: ${String(catalogExercises.length)}`,
    );

    // ---- Batch upsert: Core 50 (preserve hand-written data) ----------------
    let core50Upserted = 0;
    for (const batch of chunk(core50Exercises, BATCH_SIZE)) {
      for (const ex of batch) {
        const equipmentId = equipmentMap.get(ex.equipmentKey) ?? null;
        await sql`
          INSERT INTO exercises (
            name, instructions, body_part, target_muscle, secondary_muscles,
            equipment_id, is_custom, created_by, external_id, gif_url,
            created_at, updated_at
          )
          VALUES (
            ${ex.name},
            ${ex.instructions},
            ${ex.bodyPart},
            ${ex.targetMuscle},
            ${JSON.stringify(ex.secondaryMuscles)}::jsonb,
            ${equipmentId},
            false,
            ${null},
            ${ex.externalId},
            ${ex.gifUrl},
            now(),
            now()
          )
          ON CONFLICT (external_id) WHERE is_custom = false AND external_id IS NOT NULL
          DO UPDATE SET
            gif_url = COALESCE(exercises.gif_url, EXCLUDED.gif_url),
            updated_at = now()
        `;
        core50Upserted++;
      }
    }
    console.log(`[import] Core 50 upserted: ${String(core50Upserted)}`);

    // ---- Batch upsert: Non-Core 50 (full field update) ---------------------
    let catalogUpserted = 0;
    for (const batch of chunk(catalogExercises, BATCH_SIZE)) {
      for (const ex of batch) {
        const equipmentId = equipmentMap.get(ex.equipmentKey) ?? null;
        await sql`
          INSERT INTO exercises (
            name, instructions, body_part, target_muscle, secondary_muscles,
            equipment_id, is_custom, created_by, external_id, gif_url,
            created_at, updated_at
          )
          VALUES (
            ${ex.name},
            ${ex.instructions},
            ${ex.bodyPart},
            ${ex.targetMuscle},
            ${JSON.stringify(ex.secondaryMuscles)}::jsonb,
            ${equipmentId},
            false,
            ${null},
            ${ex.externalId},
            ${ex.gifUrl},
            now(),
            now()
          )
          ON CONFLICT (external_id) WHERE is_custom = false AND external_id IS NOT NULL
          DO UPDATE SET
            name = EXCLUDED.name,
            instructions = EXCLUDED.instructions,
            body_part = EXCLUDED.body_part,
            target_muscle = EXCLUDED.target_muscle,
            secondary_muscles = EXCLUDED.secondary_muscles,
            equipment_id = EXCLUDED.equipment_id,
            gif_url = EXCLUDED.gif_url,
            updated_at = now()
        `;
        catalogUpserted++;
      }
    }
    console.log(`[import] Catalog upserted: ${String(catalogUpserted)}`);

    // ---- Summary -----------------------------------------------------------
    logSummary(successes, core50Ids);
    console.log('[import] Done.');
  } catch (error) {
    console.error('[import] FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

function logSummary(
  successes: TransformedExercise[],
  core50Ids: Set<string>,
): void {
  const core50FromApi = successes.filter((e) => core50Ids.has(e.externalId)).length;
  const catalog = successes.length - core50FromApi;
  const bodyParts = new Set(successes.map((e) => e.bodyPart).filter(Boolean));
  const equipment = new Set(successes.map((e) => e.equipmentKey));

  console.log('\n--- Import Summary ---');
  console.log(`  Total transformed: ${String(successes.length)}`);
  console.log(`  Core 50 matched:   ${String(core50FromApi)}`);
  console.log(`  Catalog (other):   ${String(catalog)}`);
  console.log(`  Unique body parts: ${String(bodyParts.size)}`);
  console.log(`  Unique equipment:  ${String(equipment.size)}`);
  console.log('---------------------\n');
}

main();
