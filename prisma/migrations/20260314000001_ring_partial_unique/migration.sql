-- Drop the old full unique constraint on ring (applies to all rows including deleted)
DROP INDEX IF EXISTS "Bird_ring_key";

-- Create a partial unique index: only enforce uniqueness for active (non-deleted) birds
CREATE UNIQUE INDEX "Bird_ring_active_unique" ON "Bird" (ring) WHERE "deletedAt" IS NULL;
