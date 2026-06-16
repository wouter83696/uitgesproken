-- ============================================================
-- UITGESPROKEN — DEFINITIEVE RLS / HELPERS
-- ============================================================
-- Doel:
-- - Dit bestand is de bron van waarheid voor de huidige RLS-laag.
-- - Draai dit bestand opnieuw wanneer policies of helperfuncties
--   inconsistent zijn geraakt.
--
-- Verwachting:
-- - De basistabellen bestaan al:
--   profiles, spaces, sets, set_members, reserved_usernames
-- - Optioneel bestaan ook:
--   categories, profiles.role
--
-- Let op:
-- - Dit bestand maakt GEEN grote schema-redesigns.
-- - Oude fase-scripts blijven bruikbaar voor schema-opbouw, maar gebruik
--   voortaan dit bestand als definitieve permissie-/RLS-laag.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 0. BASIS: RLS AANZETTEN
-- ════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reserved_usernames'
  ) THEN
    EXECUTE 'ALTER TABLE reserved_usernames ENABLE ROW LEVEL SECURITY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    EXECUTE 'ALTER TABLE categories ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- 1. HELPERFUNCTIES
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public_maker_home_enabled(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_owner_id
      AND username IS NOT NULL
      AND public_maker_home = true
  );
$$;

CREATE OR REPLACE FUNCTION space_has_public_sets(p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sets
    WHERE space_id = p_space_id
      AND status = 'live'
      AND visibility IN ('public', 'unlisted')
  );
$$;

CREATE OR REPLACE FUNCTION current_profile_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION current_user_owns_space(p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM spaces
    WHERE id = p_space_id
      AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION current_user_owns_set(p_set_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sets s
    JOIN spaces sp ON sp.id = s.space_id
    WHERE s.id = p_set_id
      AND sp.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION current_user_is_set_member(p_set_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM set_members
    WHERE set_id = p_set_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION get_set_member_count(p_set_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM set_members
  WHERE set_id = p_set_id;
$$;

CREATE OR REPLACE FUNCTION enforce_set_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_plan TEXT;
  current_count INT;
BEGIN
  SELECT COALESCE(p.plan, 'free')
    INTO owner_plan
  FROM sets s
  JOIN spaces sp ON sp.id = s.space_id
  JOIN profiles p ON p.id = sp.owner_id
  WHERE s.id = NEW.set_id;

  IF owner_plan IS NULL THEN
    RAISE EXCEPTION 'Owner profile not found for set %', NEW.set_id;
  END IF;

  IF owner_plan = 'free' THEN
    SELECT COUNT(*)::INT
      INTO current_count
    FROM set_members
    WHERE set_id = NEW.set_id;

    IF current_count >= 2 THEN
      RAISE EXCEPTION 'FREE-plan: maximaal 2 medewerkers per kaartenset';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_set_members_from_changing_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_is_set_member(OLD.id) AND NOT current_user_owns_set(OLD.id) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.is_public IS DISTINCT FROM OLD.is_public
       OR NEW.space_id IS DISTINCT FROM OLD.space_id
       OR NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'Medewerkers mogen publicatie- of routevelden niet wijzigen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 2. DEFAULTS / KLEINE CORRECTIES
-- ════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ALTER COLUMN public_maker_home SET DEFAULT false;

UPDATE profiles
SET public_maker_home = false
WHERE public_maker_home IS DISTINCT FROM false;


-- ════════════════════════════════════════════════════════════
-- 3. TRIGGERS
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_members_limit_before_insert ON set_members;
CREATE TRIGGER set_members_limit_before_insert
  BEFORE INSERT ON set_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_set_member_limit();

DROP TRIGGER IF EXISTS sets_protected_fields_before_update ON sets;
CREATE TRIGGER sets_protected_fields_before_update
  BEFORE UPDATE ON sets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_set_members_from_changing_protected_fields();


-- ════════════════════════════════════════════════════════════
-- 4. POLICIES — RESERVED USERNAMES
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reserved_usernames'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "reserved_usernames_public_read" ON reserved_usernames';
    EXECUTE '
      CREATE POLICY "reserved_usernames_public_read"
        ON reserved_usernames FOR SELECT
        USING (true)
    ';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- 5. POLICIES — PROFILES
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_own_read" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_username_lookup" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;

CREATE POLICY "profiles_own_read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT
  USING (
    username IS NOT NULL
    AND public_maker_home = true
  );

CREATE POLICY "profiles_username_lookup"
  ON profiles FOR SELECT
  USING (username IS NOT NULL);

CREATE POLICY "profiles_admin_read"
  ON profiles FOR SELECT
  USING (current_profile_is_admin());

CREATE POLICY "profiles_own_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ════════════════════════════════════════════════════════════
-- 6. POLICIES — SPACES
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "spaces_owner_all" ON spaces;
DROP POLICY IF EXISTS "spaces_public_read" ON spaces;
DROP POLICY IF EXISTS "spaces_owner_select" ON spaces;
DROP POLICY IF EXISTS "spaces_owner_insert" ON spaces;
DROP POLICY IF EXISTS "spaces_owner_update" ON spaces;
DROP POLICY IF EXISTS "spaces_owner_delete" ON spaces;

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

CREATE POLICY "spaces_public_read"
  ON spaces FOR SELECT
  USING (
    public_maker_home_enabled(owner_id)
    OR space_has_public_sets(id)
  );


-- ════════════════════════════════════════════════════════════
-- 7. POLICIES — SETS
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sets_owner_select" ON sets;
DROP POLICY IF EXISTS "sets_owner_insert" ON sets;
DROP POLICY IF EXISTS "sets_owner_update" ON sets;
DROP POLICY IF EXISTS "sets_owner_delete" ON sets;
DROP POLICY IF EXISTS "sets_public_read" ON sets;
DROP POLICY IF EXISTS "sets_unlisted_read" ON sets;
DROP POLICY IF EXISTS "sets_member_select" ON sets;
DROP POLICY IF EXISTS "sets_member_update" ON sets;

CREATE POLICY "sets_owner_select"
  ON sets FOR SELECT
  USING (current_user_owns_space(space_id));

CREATE POLICY "sets_owner_insert"
  ON sets FOR INSERT
  WITH CHECK (current_user_owns_space(space_id));

CREATE POLICY "sets_owner_update"
  ON sets FOR UPDATE
  USING (current_user_owns_space(space_id))
  WITH CHECK (current_user_owns_space(space_id));

CREATE POLICY "sets_owner_delete"
  ON sets FOR DELETE
  USING (current_user_owns_space(space_id));

CREATE POLICY "sets_public_read"
  ON sets FOR SELECT
  USING (
    status = 'live'
    AND visibility = 'public'
  );

CREATE POLICY "sets_unlisted_read"
  ON sets FOR SELECT
  USING (
    status = 'live'
    AND visibility = 'unlisted'
  );

CREATE POLICY "sets_member_select"
  ON sets FOR SELECT
  USING (current_user_is_set_member(id));

CREATE POLICY "sets_member_update"
  ON sets FOR UPDATE
  USING (current_user_is_set_member(id))
  WITH CHECK (current_user_is_set_member(id));


-- ════════════════════════════════════════════════════════════
-- 8. POLICIES — SET_MEMBERS
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "set_members_owner_all" ON set_members;
DROP POLICY IF EXISTS "set_members_own_select" ON set_members;
DROP POLICY IF EXISTS "set_members_own_delete" ON set_members;

CREATE POLICY "set_members_owner_all"
  ON set_members FOR ALL
  USING (current_user_owns_set(set_id))
  WITH CHECK (current_user_owns_set(set_id));

CREATE POLICY "set_members_own_select"
  ON set_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "set_members_own_delete"
  ON set_members FOR DELETE
  USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════
-- 9. POLICIES — CATEGORIES (OPTIONEEL)
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "categories_public_read" ON categories';
    EXECUTE 'DROP POLICY IF EXISTS "categories_admin_insert" ON categories';
    EXECUTE 'DROP POLICY IF EXISTS "categories_admin_update" ON categories';
    EXECUTE 'DROP POLICY IF EXISTS "categories_admin_delete" ON categories';

    EXECUTE '
      CREATE POLICY "categories_public_read"
        ON categories FOR SELECT
        USING (true)
    ';
    EXECUTE '
      CREATE POLICY "categories_admin_insert"
        ON categories FOR INSERT
        WITH CHECK (current_profile_is_admin())
    ';
    EXECUTE '
      CREATE POLICY "categories_admin_update"
        ON categories FOR UPDATE
        USING (current_profile_is_admin())
    ';
    EXECUTE '
      CREATE POLICY "categories_admin_delete"
        ON categories FOR DELETE
        USING (current_profile_is_admin())
    ';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- KORTE SAMENVATTING
-- ════════════════════════════════════════════════════════════
-- profiles:
--   own read / own insert / own update
--   public maker-home read
--   username lookup
--   admin read
--
-- spaces:
--   owner CRUD
--   public read voor maker-home of publieke/unlisted sets
--
-- sets:
--   owner CRUD
--   public + unlisted read
--   member read/update
--   trigger bewaakt protected fields voor members
--
-- set_members:
--   owner beheer
--   member ziet/verwijdert eigen membership
--   trigger bewaakt FREE-limiet
