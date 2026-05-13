-- ============================================================
-- FASE 2: PROFILES TABEL + USERNAME SYSTEEM
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. GERESERVEERDE USERNAMES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reserved_usernames (
  username TEXT PRIMARY KEY
);

INSERT INTO reserved_usernames (username) VALUES
  -- Systeemroutes (uit specificatie)
  ('admin'),
  ('api'),
  ('embed'),
  ('login'),
  ('logout'),
  ('register'),
  ('pricing'),
  ('pro'),
  ('settings'),
  ('home'),
  ('workspace'),
  ('workspaces'),
  ('ruimte'),
  ('set'),
  ('sets'),
  ('user'),
  ('users'),

  -- Auth / account
  ('auth'),
  ('oauth'),
  ('sso'),
  ('signup'),
  ('signin'),
  ('signout'),
  ('account'),
  ('accounts'),
  ('profile'),
  ('profiles'),
  ('password'),
  ('reset'),
  ('verify'),
  ('verification'),
  ('activate'),
  ('deactivate'),
  ('session'),
  ('token'),
  ('join'),
  ('invite'),
  ('accept'),

  -- Systeem / infra
  ('root'),
  ('system'),
  ('internal'),
  ('external'),
  ('static'),
  ('assets'),
  ('public'),
  ('private'),
  ('cdn'),
  ('media'),
  ('upload'),
  ('uploads'),
  ('files'),
  ('images'),
  ('download'),
  ('downloads'),
  ('app'),
  ('apps'),
  ('web'),
  ('mail'),
  ('email'),
  ('smtp'),
  ('localhost'),
  ('null'),
  ('undefined'),
  ('bot'),
  ('bots'),
  ('webhook'),
  ('webhooks'),
  ('callback'),
  ('redirect'),
  ('proxy'),
  ('mirror'),
  ('sitemap'),
  ('robots'),
  ('feed'),
  ('rss'),

  -- Moderatie / personeel
  ('moderator'),
  ('mod'),
  ('staff'),
  ('official'),
  ('verified'),
  ('operator'),
  ('owner'),
  ('superuser'),
  ('superadmin'),
  ('sysadmin'),
  ('webmaster'),
  ('postmaster'),
  ('hostmaster'),
  ('abuse'),
  ('noreply'),
  ('no-reply'),
  ('bounce'),
  ('mailer'),
  ('newsletter'),
  ('notification'),
  ('notifications'),
  ('alert'),
  ('alerts'),
  ('info'),

  -- Zakelijk / content
  ('about'),
  ('help'),
  ('support'),
  ('contact'),
  ('terms'),
  ('privacy'),
  ('faq'),
  ('blog'),
  ('news'),
  ('docs'),
  ('documentation'),
  ('status'),
  ('security'),
  ('legal'),
  ('team'),
  ('jobs'),
  ('careers'),
  ('press'),
  ('media'),
  ('ads'),
  ('shop'),
  ('store'),
  ('billing'),
  ('payment'),
  ('payments'),
  ('checkout'),
  ('subscription'),
  ('subscriptions'),
  ('invoice'),
  ('invoices'),
  ('free'),
  ('enterprise'),
  ('business'),

  -- Platform / collections
  ('explore'),
  ('discover'),
  ('trending'),
  ('featured'),
  ('popular'),
  ('collections'),
  ('collection'),
  ('categories'),
  ('category'),
  ('tags'),
  ('tag'),
  ('search'),
  ('new'),
  ('latest'),
  ('best'),
  ('top'),
  ('archive'),
  ('dashboard'),
  ('panel'),

  -- Dev / tech
  ('dev'),
  ('developer'),
  ('developers'),
  ('test'),
  ('testing'),
  ('demo'),
  ('staging'),
  ('beta'),
  ('alpha'),
  ('sdk'),
  ('cli'),
  ('debug'),
  ('sandbox'),
  ('lab'),
  ('labs'),
  ('playground'),

  -- Nederlands (uitgesproken-specifiek)
  ('beheer'),
  ('inloggen'),
  ('uitloggen'),
  ('registreren'),
  ('instellingen'),
  ('profiel'),
  ('ruimtes'),
  ('collectie'),
  ('collecties'),
  ('gebruiker'),
  ('gebruikers'),
  ('kaart'),
  ('kaarten'),
  ('uitleg'),
  ('voorbeeld'),
  ('nieuw'),
  ('overzicht'),
  ('bibliotheek'),
  ('maker'),
  ('makers'),
  ('uitgesproken')

ON CONFLICT (username) DO NOTHING;

-- Iedereen mag reserved_usernames lezen (voor beschikbaarheidscheck)
ALTER TABLE reserved_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reserved_usernames_public_read"
  ON reserved_usernames FOR SELECT
  USING (true);


-- ------------------------------------------------------------
-- 2. PROFILES TABEL
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT        UNIQUE,
  plan                TEXT        NOT NULL DEFAULT 'free',
  intro_text          TEXT,
  public_maker_home   BOOLEAN     NOT NULL DEFAULT false,
  bg_variant          TEXT,
  theme_variant       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_username_format CHECK (
    username IS NULL
    OR (
      username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
      AND LENGTH(username) BETWEEN 3 AND 30
    )
  ),
  CONSTRAINT profiles_plan_values CHECK (
    plan IN ('free', 'pro')
  )
);


-- ------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 4. AUTO-AANMAKEN PROFIEL BIJ NIEUWE GEBRUIKER
-- Werkt voor elke provider (Google, Microsoft, etc.)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ------------------------------------------------------------
-- 5. HELPERFUNCTIES
-- ------------------------------------------------------------

-- Check of username gereserveerd is
CREATE OR REPLACE FUNCTION is_username_reserved(uname TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reserved_usernames WHERE username = LOWER(uname)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check of username beschikbaar is (niet gereserveerd + niet in gebruik)
CREATE OR REPLACE FUNCTION is_username_available(uname TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF LOWER(uname) !~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$' THEN
    RETURN FALSE;
  END IF;
  IF is_username_reserved(LOWER(uname)) THEN
    RETURN FALSE;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = LOWER(uname)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------
-- 6. RLS POLICIES
-- ------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eigenaar ziet altijd zijn eigen profiel
CREATE POLICY "profiles_own_read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Publieke profielen zichtbaar voor iedereen (alleen als username aanwezig)
CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT
  USING (
    username IS NOT NULL
    AND public_maker_home = true
  );

-- Eigenaar mag eigen profiel aanpassen, maar NIET zijn eigen plan verhogen
CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan = (SELECT plan FROM profiles WHERE id = auth.uid())
  );

-- Geen INSERT via client (profiel wordt automatisch aangemaakt via trigger)
-- Geen DELETE via client
