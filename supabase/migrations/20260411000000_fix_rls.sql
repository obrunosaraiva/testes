-- ============================================================
-- Migration: 20260411000000_fix_rls.sql
-- Fix: RLS misconfiguration — tables readable by anon role
--
-- ROOT CAUSE: "Enable read access for all users" Supabase Studio
-- template creates USING (true) with no role restriction, which
-- means the anon role can read every row.
--
-- APPROACH (verified against codebase):
--   • kanban_tasks, kanban_projects, kanban_templates,
--     kanban_resources, kanban_trash, kanban_messages
--     → shared workspace: ALL authenticated users read/write all rows.
--       No user-ID column exists on these tables — intentional design.
--   • kanban_cost_centers
--     → has is_private + created_by. Private CCs visible only to creator;
--       non-private CCs visible to all authenticated users.
--   • profiles
--     → any authenticated user can read all profiles (needed for assignee
--       display), but each user can only write their own row.
--   • kanban_push_subscriptions
--     → strict per-user isolation (user_id = auth.uid()).
--
-- This migration is idempotent: it drops all existing policies on the
-- affected tables before recreating them.
-- ============================================================

-- ── Step 1: Enable RLS (idempotent) ───────────────────────────────
ALTER TABLE IF EXISTS profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_cost_centers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_resources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_trash              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Step 2: Drop ALL existing policies on these tables ─────────────
-- Uses pg_policies to catch any name (including the Supabase Studio
-- "Enable read access for all users" template policies).
DO $drop$ DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'kanban_tasks',
        'kanban_projects',
        'kanban_cost_centers',
        'kanban_templates',
        'kanban_resources',
        'kanban_trash',
        'kanban_messages',
        'kanban_push_subscriptions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $drop$;

-- ── Step 3: CREATE replacement policies ───────────────────────────
-- Rule: every policy scoped to TO authenticated.
-- Anonymous role cannot match any of these and sees zero rows.
-- The service_role (Express backend) bypasses RLS by design.

-- ── kanban_tasks (shared workspace) ───────────────────────────────
CREATE POLICY "kb_tasks_select"
  ON public.kanban_tasks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_tasks_insert"
  ON public.kanban_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_tasks_update"
  ON public.kanban_tasks FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_tasks_delete"
  ON public.kanban_tasks FOR DELETE
  TO authenticated USING (true);

-- ── kanban_projects (shared workspace) ────────────────────────────
CREATE POLICY "kb_projects_select"
  ON public.kanban_projects FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_projects_insert"
  ON public.kanban_projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_projects_update"
  ON public.kanban_projects FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_projects_delete"
  ON public.kanban_projects FOR DELETE
  TO authenticated USING (true);

-- ── kanban_templates (shared workspace) ───────────────────────────
CREATE POLICY "kb_templates_select"
  ON public.kanban_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_templates_insert"
  ON public.kanban_templates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_templates_update"
  ON public.kanban_templates FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_templates_delete"
  ON public.kanban_templates FOR DELETE
  TO authenticated USING (true);

-- ── kanban_resources (shared workspace) ───────────────────────────
CREATE POLICY "kb_resources_select"
  ON public.kanban_resources FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_resources_insert"
  ON public.kanban_resources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_resources_update"
  ON public.kanban_resources FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_resources_delete"
  ON public.kanban_resources FOR DELETE
  TO authenticated USING (true);

-- ── kanban_trash (shared workspace) ───────────────────────────────
CREATE POLICY "kb_trash_select"
  ON public.kanban_trash FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_trash_insert"
  ON public.kanban_trash FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_trash_update"
  ON public.kanban_trash FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_trash_delete"
  ON public.kanban_trash FOR DELETE
  TO authenticated USING (true);

-- ── kanban_messages (shared workspace) ────────────────────────────
CREATE POLICY "kb_messages_select"
  ON public.kanban_messages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_messages_insert"
  ON public.kanban_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_messages_update"
  ON public.kanban_messages FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "kb_messages_delete"
  ON public.kanban_messages FOR DELETE
  TO authenticated USING (true);

-- ── kanban_cost_centers (hybrid: public + private-to-creator) ─────
-- Non-private CCs are visible to all authenticated users.
-- Private CCs are visible only to their creator.
-- Write is restricted to the creator for private CCs;
-- any authenticated user can create/edit non-private ones.
CREATE POLICY "kb_cc_select"
  ON public.kanban_cost_centers FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR created_by = auth.uid()::text
  );

CREATE POLICY "kb_cc_insert"
  ON public.kanban_cost_centers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kb_cc_update"
  ON public.kanban_cost_centers FOR UPDATE
  TO authenticated
  USING (
    is_private = false
    OR created_by = auth.uid()::text
  );

CREATE POLICY "kb_cc_delete"
  ON public.kanban_cost_centers FOR DELETE
  TO authenticated
  USING (created_by = auth.uid()::text OR is_private = false);

-- ── profiles (read-all / write-own) ───────────────────────────────
-- Any authenticated user can read all profiles (needed for assignee
-- dropdowns and member lists). Only the row owner can write.
CREATE POLICY "kb_profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "kb_profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "kb_profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "kb_profiles_delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid()::text);

-- ── kanban_push_subscriptions (strict per-user) ───────────────────
CREATE POLICY "kb_push_select"
  ON public.kanban_push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "kb_push_insert"
  ON public.kanban_push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "kb_push_update"
  ON public.kanban_push_subscriptions FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "kb_push_delete"
  ON public.kanban_push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ── Verification query (run after applying) ───────────────────────
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname='public'
--   AND tablename IN ('profiles','kanban_projects','kanban_tasks','kanban_messages',
--                     'kanban_resources','kanban_cost_centers','kanban_templates',
--                     'kanban_push_subscriptions','kanban_trash')
-- ORDER BY tablename, cmd;
--
-- Expected: every row shows roles = '{authenticated}', NO '{anon}' rows.
