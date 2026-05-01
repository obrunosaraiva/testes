-- ============================================================
-- Diagnóstico Íntimo — schema inicial
-- ============================================================
-- Tabelas: profiles, respondents, answers, email_logs, favorited_answers.
-- Estratégia de segurança: respondentes (alunas) não fazem login. Toda
-- escrita em respondents/answers passa por server actions usando o
-- service_role. Apenas a expert (admin) tem acesso autenticado e leitura
-- total. RLS está habilitada em todas as tabelas e bloqueia acesso anônimo.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- A tabela auth.users é gerenciada pelo Supabase Auth. profiles guarda
-- metadados da expert (única usuária autenticada hoje).
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- RESPONDENTES (alunas que respondem o quiz)
-- ============================================================
create table if not exists public.respondents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  age_range text check (age_range in ('20-29','30-39','40-49','50+','nao_informado')),
  has_children text check (has_children in ('nao','parto_normal','cesarea','ambos','nao_informado')),
  status text not null default 'started' check (status in (
    'started','block_1_completed','block_2_completed','result_delivered'
  )),
  profile_archetype text check (profile_archetype in (
    'renascimento','expansao','equilibrio','dominio'
  )),
  consent_lgpd_at timestamptz not null,
  eligible_for_draw boolean not null default false,
  draw_winner boolean not null default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  device_type text check (device_type in ('mobile','desktop','tablet')),
  started_at timestamptz not null default now(),
  block_1_completed_at timestamptz,
  block_2_completed_at timestamptz,
  result_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint respondents_email_unique unique (email)
);

create index if not exists idx_respondents_email on public.respondents (email);
create index if not exists idx_respondents_status on public.respondents (status);
create index if not exists idx_respondents_archetype on public.respondents (profile_archetype);
create index if not exists idx_respondents_age on public.respondents (age_range);
create index if not exists idx_respondents_eligible_for_draw on public.respondents (eligible_for_draw) where eligible_for_draw;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_respondents_updated_at on public.respondents;
create trigger trg_respondents_updated_at
  before update on public.respondents
  for each row execute function public.set_updated_at();

-- ============================================================
-- ANSWERS (uma linha por pergunta respondida)
-- ============================================================
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null references public.respondents(id) on delete cascade,
  question_code text not null,
  block int not null check (block in (0,1,2)),
  answer_text text,
  answer_choice text,
  answer_choices text[],
  answer_number int,
  answered_at timestamptz not null default now(),
  constraint answers_unique_per_question unique (respondent_id, question_code)
);

create index if not exists idx_answers_respondent on public.answers (respondent_id);
create index if not exists idx_answers_question on public.answers (question_code);
create index if not exists idx_answers_block on public.answers (block);

-- ============================================================
-- EMAIL_LOGS (rastrear envios via Resend)
-- ============================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid references public.respondents(id) on delete set null,
  email_type text not null check (email_type in ('result','reminder','draw_winner')),
  resend_message_id text,
  status text check (status in ('sent','delivered','opened','clicked','failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_logs_respondent on public.email_logs (respondent_id);
create index if not exists idx_email_logs_type on public.email_logs (email_type);

-- ============================================================
-- FAVORITED_ANSWERS (admin marca respostas abertas como gold)
-- ============================================================
create table if not exists public.favorited_answers (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  favorited_at timestamptz not null default now(),
  constraint favorited_unique_per_admin unique (answer_id, admin_user_id)
);

create index if not exists idx_favorited_answers_admin on public.favorited_answers (admin_user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles: a expert só pode ler/atualizar o próprio profile.
alter table public.profiles enable row level security;

drop policy if exists "service role full access profiles" on public.profiles;
create policy "service role full access profiles"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin reads own profile" on public.profiles;
create policy "admin reads own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- respondents: escrita só via service role; admin lê tudo.
alter table public.respondents enable row level security;

drop policy if exists "service role full access respondents" on public.respondents;
create policy "service role full access respondents"
  on public.respondents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin reads all respondents" on public.respondents;
create policy "admin reads all respondents"
  on public.respondents for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- answers: escrita só via service role; admin lê tudo.
alter table public.answers enable row level security;

drop policy if exists "service role full access answers" on public.answers;
create policy "service role full access answers"
  on public.answers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin reads all answers" on public.answers;
create policy "admin reads all answers"
  on public.answers for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- email_logs: escrita só via service role; admin lê tudo.
alter table public.email_logs enable row level security;

drop policy if exists "service role full access email_logs" on public.email_logs;
create policy "service role full access email_logs"
  on public.email_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin reads all email_logs" on public.email_logs;
create policy "admin reads all email_logs"
  on public.email_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- favorited_answers: cada admin gerencia seus próprios favoritos.
alter table public.favorited_answers enable row level security;

drop policy if exists "service role full access favorited_answers" on public.favorited_answers;
create policy "service role full access favorited_answers"
  on public.favorited_answers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "admin manages own favorites" on public.favorited_answers;
create policy "admin manages own favorites"
  on public.favorited_answers for all
  using (auth.uid() = admin_user_id)
  with check (auth.uid() = admin_user_id);
