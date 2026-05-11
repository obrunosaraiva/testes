-- ============================================================
-- Row Level Security + Auth sync + helpers
-- Aplicado depois das migrations base do Drizzle.
-- ============================================================

-- =========================================================
-- 1. Trigger: ao criar usuário em auth.users, criar em public.users
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 2. Helper: time(s) do usuário atual (para usar nas policies)
-- =========================================================
create or replace function public.user_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

-- =========================================================
-- 3. RLS: ativar em todas as tabelas multi-tenant
-- =========================================================
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.devices enable row level security;
alter table public.contacts enable row level security;
alter table public.transcriptions enable row level security;
alter table public.word_corrections enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.usage_records enable row level security;
alter table public.forwarding_rules enable row level security;

-- =========================================================
-- 4. Policies — users
-- =========================================================
create policy "users_select_self" on public.users
  for select using (auth.uid() = id);

create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

-- =========================================================
-- 5. Policies — teams
-- =========================================================
create policy "teams_select_member" on public.teams
  for select using (id in (select public.user_team_ids()));

create policy "teams_insert_authenticated" on public.teams
  for insert with check (auth.uid() = owner_id);

create policy "teams_update_owner_admin" on public.teams
  for update using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "teams_delete_owner" on public.teams
  for delete using (owner_id = auth.uid());

-- =========================================================
-- 6. Policies — team_members
-- =========================================================
create policy "team_members_select_same_team" on public.team_members
  for select using (team_id in (select public.user_team_ids()));

create policy "team_members_insert_owner_admin" on public.team_members
  for insert with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );

create policy "team_members_delete_owner" on public.team_members
  for delete using (
    exists (
      select 1 from public.teams
      where id = team_members.team_id
        and owner_id = auth.uid()
    )
  );

-- =========================================================
-- 7. Policies genéricas — qualquer tabela com team_id
-- =========================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'devices', 'word_corrections', 'subscriptions',
      'usage_records', 'forwarding_rules'
    ])
  loop
    execute format('
      create policy "%I_team_member_all" on public.%I
        for all
        using (team_id in (select public.user_team_ids()))
        with check (team_id in (select public.user_team_ids()));
    ', t, t);
  end loop;
end$$;

-- contacts e transcriptions: acessíveis via device_id
create policy "contacts_via_device" on public.contacts
  for all
  using (
    device_id in (
      select id from public.devices where team_id in (select public.user_team_ids())
    )
  )
  with check (
    device_id in (
      select id from public.devices where team_id in (select public.user_team_ids())
    )
  );

create policy "transcriptions_via_device" on public.transcriptions
  for all
  using (
    device_id in (
      select id from public.devices where team_id in (select public.user_team_ids())
    )
  )
  with check (
    device_id in (
      select id from public.devices where team_id in (select public.user_team_ids())
    )
  );

-- invoices via subscription
create policy "invoices_via_subscription" on public.invoices
  for select
  using (
    subscription_id in (
      select id from public.subscriptions where team_id in (select public.user_team_ids())
    )
  );

-- =========================================================
-- 8. Service role bypassa RLS automaticamente — workers ok
-- =========================================================
