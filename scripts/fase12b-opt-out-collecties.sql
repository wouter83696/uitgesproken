-- ============================================================
-- FASE 12b: OPT-OUT COLLECTIES OP PROFIELNIVEAU
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================
-- allow_platform_collections verplaatst van sets → profiles
-- public_maker_home default gewijzigd naar true
-- ============================================================

-- ── 1. Kolom toevoegen aan profiles ──────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS allow_platform_collections
    BOOLEAN NOT NULL DEFAULT true;


-- ── 2. public_maker_home default → true ──────────────────────

ALTER TABLE profiles
  ALTER COLUMN public_maker_home SET DEFAULT true;


-- ── 3. Bestaande gebruikers bijwerken ─────────────────────────

UPDATE profiles SET
  public_maker_home            = true,
  allow_platform_collections   = true;


-- ── KLAAR ──
-- Nieuwe gebruikers: public_maker_home = true, collecties = true
-- Gebruiker kan opt-out via instellingen (één toggle voor alle sets)
-- sets.allow_platform_collections blijft bestaan maar wordt niet meer gebruikt in UI
