-- ============================================================
-- FASE 3: SPACES RLS CHECK + UPDATE
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================
-- Controleer eerst of RLS al actief is op spaces:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'spaces';
-- Als relrowsecurity = false → voer dit script uit.
-- ============================================================

-- RLS inschakelen (veilig als het al aan staat)
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- ── Bestaande policies verwijderen zodat we ze netjes opnieuw zetten ──
DROP POLICY IF EXISTS "spaces_owner_all"      ON spaces;
DROP POLICY IF EXISTS "spaces_public_read"    ON spaces;
DROP POLICY IF EXISTS "spaces_owner_select"   ON spaces;
DROP POLICY IF EXISTS "spaces_owner_insert"   ON spaces;
DROP POLICY IF EXISTS "spaces_owner_update"   ON spaces;
DROP POLICY IF EXISTS "spaces_owner_delete"   ON spaces;

-- ── Eigenaar heeft volledige toegang tot eigen spaces ──
CREATE POLICY "spaces_owner_select"
  ON spaces FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "spaces_owner_insert"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "spaces_owner_update"
  ON spaces FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "spaces_owner_delete"
  ON spaces FOR DELETE
  USING (auth.uid() = owner_id);

-- ── Publieke workspace-home: alleen zichtbaar als space expliciet publiek is
--    EN de eigenaar een pro-plan heeft (via profiles tabel).
--    Voor nu: geen enkele space is publiek via deze route (PRO-feature).
--    Wanneer PRO actief wordt: voeg is_public kolom toe aan spaces
--    en activeer de policy hieronder.
-- ──────────────────────────────────────────────────────────────
-- CREATE POLICY "spaces_public_read"
--   ON spaces FOR SELECT
--   USING (
--     is_public = true
--     AND EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = spaces.owner_id
--       AND profiles.plan = 'pro'
--     )
--   );
-- ──────────────────────────────────────────────────────────────
-- KLAAR: alleen eigenaren kunnen hun eigen spaces zien/bewerken.
-- Publieke workspace-home is uitgecommentarieerd totdat PRO actief is.
