-- ============================================================
-- FIX: profiles_own_update policy — recursieve subquery
-- Uitgesproken — uitvoeren in Supabase SQL Editor
-- ============================================================
-- Probleem: WITH CHECK bevatte (SELECT plan FROM profiles ...)
-- wat RLS recursief triggert en stil faalt (0 rijen geüpdated).
-- Oplossing: simpele policy zonder subquery.
-- Plan-wijzigingen verlopen via server-side functies, niet RLS.
-- ============================================================

DROP POLICY IF EXISTS "profiles_own_update" ON profiles;

CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
