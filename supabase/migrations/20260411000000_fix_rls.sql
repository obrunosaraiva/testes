-- ============================================================
-- KANBAN PRO — RLS Fix (versão robusta, sem DO blocks)
-- Cole TUDO de uma vez no SQL Editor do Supabase e clique Run
-- ============================================================

-- ── 1. Ativar RLS em todas as tabelas ─────────────────────────────
ALTER TABLE IF EXISTS profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_cost_centers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_resources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_trash              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kanban_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 2. Remover policies abertas (nome padrão do template Supabase) ─
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_resources;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_trash;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kanban_push_subscriptions;

-- Remover policies criadas pelos commits anteriores (se existirem)
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_tasks;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_projects;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_templates;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_resources;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_trash;
DROP POLICY IF EXISTS "auth_all"    ON public.kanban_messages;
DROP POLICY IF EXISTS "auth_select" ON public.profiles;
DROP POLICY IF EXISTS "auth_own"    ON public.profiles;
DROP POLICY IF EXISTS "auth_own"    ON public.kanban_push_subscriptions;

DROP POLICY IF EXISTS "kb_tasks_select"      ON public.kanban_tasks;
DROP POLICY IF EXISTS "kb_tasks_insert"      ON public.kanban_tasks;
DROP POLICY IF EXISTS "kb_tasks_update"      ON public.kanban_tasks;
DROP POLICY IF EXISTS "kb_tasks_delete"      ON public.kanban_tasks;
DROP POLICY IF EXISTS "kb_projects_select"   ON public.kanban_projects;
DROP POLICY IF EXISTS "kb_projects_insert"   ON public.kanban_projects;
DROP POLICY IF EXISTS "kb_projects_update"   ON public.kanban_projects;
DROP POLICY IF EXISTS "kb_projects_delete"   ON public.kanban_projects;
DROP POLICY IF EXISTS "kb_cc_select"         ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "kb_cc_insert"         ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "kb_cc_update"         ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "kb_cc_delete"         ON public.kanban_cost_centers;
DROP POLICY IF EXISTS "kb_templates_select"  ON public.kanban_templates;
DROP POLICY IF EXISTS "kb_templates_insert"  ON public.kanban_templates;
DROP POLICY IF EXISTS "kb_templates_update"  ON public.kanban_templates;
DROP POLICY IF EXISTS "kb_templates_delete"  ON public.kanban_templates;
DROP POLICY IF EXISTS "kb_resources_select"  ON public.kanban_resources;
DROP POLICY IF EXISTS "kb_resources_insert"  ON public.kanban_resources;
DROP POLICY IF EXISTS "kb_resources_update"  ON public.kanban_resources;
DROP POLICY IF EXISTS "kb_resources_delete"  ON public.kanban_resources;
DROP POLICY IF EXISTS "kb_trash_select"      ON public.kanban_trash;
DROP POLICY IF EXISTS "kb_trash_insert"      ON public.kanban_trash;
DROP POLICY IF EXISTS "kb_trash_update"      ON public.kanban_trash;
DROP POLICY IF EXISTS "kb_trash_delete"      ON public.kanban_trash;
DROP POLICY IF EXISTS "kb_messages_select"   ON public.kanban_messages;
DROP POLICY IF EXISTS "kb_messages_insert"   ON public.kanban_messages;
DROP POLICY IF EXISTS "kb_messages_update"   ON public.kanban_messages;
DROP POLICY IF EXISTS "kb_messages_delete"   ON public.kanban_messages;
DROP POLICY IF EXISTS "kb_profiles_select"   ON public.profiles;
DROP POLICY IF EXISTS "kb_profiles_insert"   ON public.profiles;
DROP POLICY IF EXISTS "kb_profiles_update"   ON public.profiles;
DROP POLICY IF EXISTS "kb_profiles_delete"   ON public.profiles;
DROP POLICY IF EXISTS "kb_push_select"       ON public.kanban_push_subscriptions;
DROP POLICY IF EXISTS "kb_push_insert"       ON public.kanban_push_subscriptions;
DROP POLICY IF EXISTS "kb_push_update"       ON public.kanban_push_subscriptions;
DROP POLICY IF EXISTS "kb_push_delete"       ON public.kanban_push_subscriptions;

-- ── 3. Criar policies corretas ─────────────────────────────────────
-- Regra: TO authenticated bloqueia o role anon completamente.
-- O service_role (backend Express) ignora RLS por padrão.

-- kanban_tasks
CREATE POLICY "kb_tasks_select"    ON public.kanban_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_tasks_insert"    ON public.kanban_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_tasks_update"    ON public.kanban_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_tasks_delete"    ON public.kanban_tasks FOR DELETE TO authenticated USING (true);

-- kanban_projects
CREATE POLICY "kb_projects_select" ON public.kanban_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_projects_insert" ON public.kanban_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_projects_update" ON public.kanban_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_projects_delete" ON public.kanban_projects FOR DELETE TO authenticated USING (true);

-- kanban_templates
CREATE POLICY "kb_templates_select" ON public.kanban_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_templates_insert" ON public.kanban_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_templates_update" ON public.kanban_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_templates_delete" ON public.kanban_templates FOR DELETE TO authenticated USING (true);

-- kanban_resources
CREATE POLICY "kb_resources_select" ON public.kanban_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_resources_insert" ON public.kanban_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_resources_update" ON public.kanban_resources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_resources_delete" ON public.kanban_resources FOR DELETE TO authenticated USING (true);

-- kanban_trash
CREATE POLICY "kb_trash_select"    ON public.kanban_trash FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_trash_insert"    ON public.kanban_trash FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_trash_update"    ON public.kanban_trash FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_trash_delete"    ON public.kanban_trash FOR DELETE TO authenticated USING (true);

-- kanban_messages
CREATE POLICY "kb_messages_select" ON public.kanban_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_messages_insert" ON public.kanban_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_messages_update" ON public.kanban_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_messages_delete" ON public.kanban_messages FOR DELETE TO authenticated USING (true);

-- kanban_cost_centers (privado por criador)
CREATE POLICY "kb_cc_select"       ON public.kanban_cost_centers FOR SELECT TO authenticated USING (is_private = false OR created_by = auth.uid()::text);
CREATE POLICY "kb_cc_insert"       ON public.kanban_cost_centers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_cc_update"       ON public.kanban_cost_centers FOR UPDATE TO authenticated USING (is_private = false OR created_by = auth.uid()::text);
CREATE POLICY "kb_cc_delete"       ON public.kanban_cost_centers FOR DELETE TO authenticated USING (is_private = false OR created_by = auth.uid()::text);

-- profiles (leitura geral / escrita somente no próprio perfil)
-- Usa ::text nos dois lados para evitar erro uuid=text
CREATE POLICY "kb_profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id::text = auth.uid()::text);
CREATE POLICY "kb_profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id::text = auth.uid()::text) WITH CHECK (id::text = auth.uid()::text);
CREATE POLICY "kb_profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (id::text = auth.uid()::text);

-- kanban_push_subscriptions (somente as próprias)
CREATE POLICY "kb_push_select"     ON public.kanban_push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "kb_push_insert"     ON public.kanban_push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "kb_push_update"     ON public.kanban_push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "kb_push_delete"     ON public.kanban_push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- ── 4. Verificar resultado ─────────────────────────────────────────
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles','kanban_tasks','kanban_projects','kanban_cost_centers',
    'kanban_templates','kanban_resources','kanban_trash',
    'kanban_messages','kanban_push_subscriptions'
  )
ORDER BY tablename, cmd;
-- Resultado esperado: roles = {authenticated} em TODAS as linhas.
-- Se aparecer {anon} ou {public} em qualquer linha, avise.
