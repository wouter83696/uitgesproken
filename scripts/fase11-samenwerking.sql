-- ============================================================
-- FASE 11: SAMENWERKING — SET_MEMBERS
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================

-- ── 1. Tabel ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS set_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id      UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'editor'
                CONSTRAINT set_members_role CHECK (role IN ('editor')),
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (set_id, user_id)
);

CREATE INDEX IF NOT EXISTS set_members_set_id_idx  ON set_members(set_id);
CREATE INDEX IF NOT EXISTS set_members_user_id_idx ON set_members(user_id);


-- ── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE set_members ENABLE ROW LEVEL SECURITY;

-- Eigenaar van de set mag alles
CREATE POLICY "set_members_owner_all"
  ON set_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sets s
      JOIN spaces sp ON sp.id = s.space_id
      WHERE s.id = set_members.set_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sets s
      JOIN spaces sp ON sp.id = s.space_id
      WHERE s.id = set_members.set_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Medewerker mag zijn eigen membership zien (en verwijderen)
CREATE POLICY "set_members_own_select"
  ON set_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "set_members_own_delete"
  ON set_members FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Helper: aantal medewerkers ophalen ────────────────────

CREATE OR REPLACE FUNCTION get_set_member_count(p_set_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM set_members WHERE set_id = p_set_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ── KLAAR ──
-- set_members: eigenaar beheert, medewerker ziet/verlaat eigen rij
-- Max 2 medewerkers (FREE) wordt gecontroleerd op client + via count
