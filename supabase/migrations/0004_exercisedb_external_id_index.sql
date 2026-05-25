-- ==========================================================================
-- Migration: 0004_exercisedb_external_id_index
-- Description: Partial unique index on exercises.external_id for catalog upsert.
-- Enables ON CONFLICT (external_id) WHERE is_custom = false AND external_id IS NOT NULL
-- for the ExerciseDB import script and future catalog refreshes.
-- ==========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS exercises_external_id_unique_catalog
  ON exercises (external_id)
  WHERE is_custom = false AND external_id IS NOT NULL;
