-- ============================================================
-- FASE 13: VOLLEDIGE RLS REVIEW
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================
-- Doel van deze review:
-- 1. maker/index.html werkt ook voor publieke bezoekers
-- 2. username-lookup voor uitnodigingen werkt ook als maker-home privé is
-- 3. medewerkers kunnen private sets lezen/bewerken waar ze lid van zijn
-- 4. FREE-limiet van max. 2 extra medewerkers wordt ook database-side bewaakt
-- 5. profiles update-policy gebruikt geen recursieve subquery
-- 6. public_maker_home staat weer veilig standaard UIT
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 0.1 PROFILES — maker-home default terug naar veilig privé
-- ════════════════════════════════════════════════════════════
-- Fase 12b zette public_maker_home op true. Voor de huidige richting
-- willen we maker-home expliciet laten aanzetten door de gebruiker.
--
-- Omdat dit project nog in opbouw is, zetten we zowel de default als de
-- bestaande records terug naar false.

ALTER TABLE profiles
  ALTER COLUMN public_maker_home SET DEFAULT false;

UPDATE profiles
SET public_maker_home = false
WHERE public_maker_home IS DISTINCT FROM false;


-- ════════════════════════════════════════════════════════════
-- 0.2 PROFILES — eigen profielrij mogen aanmaken indien ontbrekend
-- ════════════════════════════════════════════════════════════
-- Voor oudere accounts kan het profiel ontbreken als ze vóór de trigger
-- zijn ontstaan. Deze policy maakt een veilige own upsert/insert mogelijk.

DROP POLICY IF EXISTS "profiles_own_insert" ON profiles;

CREATE POLICY "profiles_own_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ════════════════════════════════════════════════════════════
-- 0.3 PROFILES — veilige update policy zonder recursie
-- ════════════════════════════════════════════════════════════
-- Eerdere versie gebruikte:
--   plan = (SELECT plan FROM profiles WHERE id = auth.uid())
-- in WITH CHECK, wat recursieve RLS-triggers kan veroorzaken.
-- Plan-upgrades horen later via server-side billing/admin te lopen.

DROP POLICY IF EXISTS "profiles_own_update" ON profiles;

CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ════════════════════════════════════════════════════════════
-- 1. SPACES — publieke leestoegang voor makerroute
-- ════════════════════════════════════════════════════════════
-- Probleem:
-- maker/index.html leest eerst het profiel en daarna de bijbehorende space.
-- Zonder publieke SELECT-policy op spaces krijgt een bezoeker de makerpagina
-- of publieke setpagina niet geladen.
--
-- Oplossing:
-- Een space mag publiek gelezen worden als:
-- - de maker-home expliciet openbaar is, OF
-- - er minstens één live public/unlisted set in die space bestaat.
--
-- Zo blijft een volledig privé space afgeschermd, terwijl losse publieke
-- setlinks ook blijven werken wanneer public_maker_home = false.

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

DROP POLICY IF EXISTS "spaces_public_read" ON spaces;

CREATE POLICY "spaces_public_read"
  ON spaces FOR SELECT
  USING (
    public_maker_home_enabled(owner_id)
    OR space_has_public_sets(id)
  );


-- ════════════════════════════════════════════════════════════
-- 2. PROFILES — username lookup voor uitnodigingen
-- ════════════════════════════════════════════════════════════
-- Probleem:
-- inviteCollaborator zoekt profiles op username. Dat moet ook werken
-- wanneer de maker-home privé is, anders faalt samenwerken onnodig.
--
-- Let op:
-- username is hier bewust publiek opzoekbaar. Verdere profilevelden worden
-- niet gebruikt in deze flow, maar blijven wel onderdeel van dezelfde rij.

DROP POLICY IF EXISTS "profiles_username_lookup" ON profiles;

CREATE POLICY "profiles_username_lookup"
  ON profiles FOR SELECT
  USING (username IS NOT NULL);


-- ════════════════════════════════════════════════════════════
-- 3. PROFILES — admin read zonder recursieve profiles-query
-- ════════════════════════════════════════════════════════════
-- Een policy op profiles mag niet opnieuw profiles lezen, anders ontstaat
-- oneindige RLS-recursie. Daarom gebruiken we een SECURITY DEFINER helper.

DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;

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

CREATE POLICY "profiles_admin_read"
  ON profiles FOR SELECT
  USING (current_profile_is_admin());


-- ════════════════════════════════════════════════════════════
-- 4. SETS / SET_MEMBERS — helpers zonder recursieve policy-loops
-- ════════════════════════════════════════════════════════════
-- sets -> set_members -> sets veroorzaakte een wederzijdse RLS-lus.
-- Daarom centraliseren we de checks in SECURITY DEFINER helpers.

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


-- ════════════════════════════════════════════════════════════
-- 5. SETS — owner policies zonder recursieve spaces-query
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sets_owner_select" ON sets;
DROP POLICY IF EXISTS "sets_owner_insert" ON sets;
DROP POLICY IF EXISTS "sets_owner_update" ON sets;
DROP POLICY IF EXISTS "sets_owner_delete" ON sets;

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


-- ════════════════════════════════════════════════════════════
-- 6. SET_MEMBERS — policies zonder recursieve sets-query
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
-- 7. SETS — medewerkers kunnen hun toegewezen sets lezen
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sets_member_select" ON sets;

CREATE POLICY "sets_member_select"
  ON sets FOR SELECT
  USING (current_user_is_set_member(id));


-- ════════════════════════════════════════════════════════════
-- 8. SETS — medewerkers kunnen bewerken, maar niet publiceren
-- ════════════════════════════════════════════════════════════
-- De policy zelf controleert alleen membership.
-- Beschermde velden bewaken we via een trigger, zodat de policy geen
-- recursieve self-query op sets hoeft te doen.

DROP POLICY IF EXISTS "sets_member_update" ON sets;

CREATE POLICY "sets_member_update"
  ON sets FOR UPDATE
  USING (current_user_is_set_member(id))
  WITH CHECK (current_user_is_set_member(id));


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

DROP TRIGGER IF EXISTS sets_protected_fields_before_update ON sets;

CREATE TRIGGER sets_protected_fields_before_update
  BEFORE UPDATE ON sets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_set_members_from_changing_protected_fields();


-- ════════════════════════════════════════════════════════════
-- 9. SET_MEMBERS — FREE limiet ook database-side afdwingen
-- ════════════════════════════════════════════════════════════
-- Client-side staat de limiet al in admin/supabase-data.js, maar voor
-- security moet dezelfde regel ook in de database bewaakt worden.
--
-- Regel:
-- FREE owner → maximaal 2 extra medewerkers per set
-- PRO owner  → geen limiet vanuit deze trigger

CREATE OR REPLACE FUNCTION enforce_set_member_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_members_limit_before_insert ON set_members;

CREATE TRIGGER set_members_limit_before_insert
  BEFORE INSERT ON set_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_set_member_limit();


-- ════════════════════════════════════════════════════════════
-- OVERZICHT NA DEZE MIGRATIE
-- ════════════════════════════════════════════════════════════
--
-- profiles:
--   SELECT  eigenaar | username lookup | admin (indien role bestaat)
--   UPDATE  eigenaar
--
-- spaces:
--   SELECT  eigenaar | publiek als maker-home openbaar is
--           | publiek als er live public/unlisted sets bestaan
--
-- sets:
--   SELECT  eigenaar | live+public | live+unlisted | medewerker
--   UPDATE  eigenaar | medewerker (geen publicatievelden/slugs/space)
--
-- set_members:
--   ALL     eigenaar van de set (via fase 11)
--   SELECT  eigen membership
--   DELETE  eigen membership
--   INSERT  owner, met FREE-limiet database-side afgedwongen
