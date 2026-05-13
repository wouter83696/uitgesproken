-- ============================================================
-- FASE 9b: ADMIN ROL + CATEGORIEËN
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================

-- ── 1. Role kolom op profiles ────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CONSTRAINT profiles_role_values CHECK (role IN ('user', 'admin'));


-- ── 2. Jouw account instellen als admin ──────────────────────
-- Pas 'wouter' aan als je een andere gebruikersnaam hebt gekozen.

UPDATE profiles
SET role = 'admin'
WHERE username = 'wouter';


-- ── 3. Categorieën tabel ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$')
);

-- Alleen admins mogen categorieën beheren
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "categories_admin_insert"
  ON categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_update"
  ON categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "categories_admin_delete"
  ON categories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── 4. category_id op sets ───────────────────────────────────

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;


-- ── 5. Starter categorieën ───────────────────────────────────
-- Je kunt deze later aanpassen of verwijderen.

INSERT INTO categories (slug, label, sort_order) VALUES
  ('taal-literatuur',    'Taal & Literatuur',    10),
  ('wiskunde',           'Wiskunde',             20),
  ('geschiedenis',       'Geschiedenis',         30),
  ('aardrijkskunde',     'Aardrijkskunde',       40),
  ('biologie',           'Biologie',             50),
  ('exacte-vakken',      'Exacte vakken',        60),
  ('mens-maatschappij',  'Mens & Maatschappij',  70),
  ('kunst-cultuur',      'Kunst & Cultuur',      80),
  ('overig',             'Overig',               90)
ON CONFLICT (slug) DO NOTHING;


-- ── KLAAR ──
-- profiles.role: 'user' (default) of 'admin'
-- categories: door admin beheerd, publiek leesbaar
-- sets.category_id: optioneel, FK naar categories
