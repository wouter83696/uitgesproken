-- ============================================================
-- FASE 7: PUBLICATIESTRUCTUUR VOOR SETS
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================
-- Bestaande kolom is_public blijft staan voor backwards-compat.
-- Nieuwe velden: status, visibility, allow_platform_collections
-- ============================================================

-- ── 1. Kolommen toevoegen ────────────────────────────────────

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CONSTRAINT sets_status_values CHECK (status IN ('draft','live')),

  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
    CONSTRAINT sets_visibility_values CHECK (visibility IN ('private','unlisted','public')),

  ADD COLUMN IF NOT EXISTS allow_platform_collections BOOLEAN NOT NULL DEFAULT false;


-- ── 2. Bestaande sets migreren ───────────────────────────────
-- is_public = true  → live + public
-- is_public = false → live + private
-- (bestaande sets waren al actief, dus status = 'live')

UPDATE sets
SET
  status     = 'live',
  visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
WHERE status = 'draft';


-- ── 3. RLS inschakelen op sets ───────────────────────────────

ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sets_owner_select"   ON sets;
DROP POLICY IF EXISTS "sets_owner_insert"   ON sets;
DROP POLICY IF EXISTS "sets_owner_update"   ON sets;
DROP POLICY IF EXISTS "sets_owner_delete"   ON sets;
DROP POLICY IF EXISTS "sets_public_read"    ON sets;
DROP POLICY IF EXISTS "sets_unlisted_read"  ON sets;

-- Eigenaar heeft volledige toegang
CREATE POLICY "sets_owner_select"
  ON sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = sets.space_id
      AND spaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "sets_owner_insert"
  ON sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = sets.space_id
      AND spaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "sets_owner_update"
  ON sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = sets.space_id
      AND spaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "sets_owner_delete"
  ON sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = sets.space_id
      AND spaces.owner_id = auth.uid()
    )
  );

-- Publiek leesbaar: live + public
CREATE POLICY "sets_public_read"
  ON sets FOR SELECT
  USING (
    status = 'live'
    AND visibility = 'public'
  );

-- Unlisted leesbaar: live + unlisted (bereikbaar via directe link)
CREATE POLICY "sets_unlisted_read"
  ON sets FOR SELECT
  USING (
    status = 'live'
    AND visibility = 'unlisted'
  );

-- ── KLAAR ──
-- Defaults voor nieuwe sets: draft + private + allow_platform_collections = false
-- Eigenaar beheert volledige toegang
-- Publiek: alleen live+public of live+unlisted
-- is_public blijft gesynchroniseerd via de editor (Fase 9)
