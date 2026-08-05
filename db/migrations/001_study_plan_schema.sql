-- =============================================================
-- AprovaIA — estrutura de cronograma de estudos
-- Rode este arquivo no SQL Editor do SEU projeto Supabase.
-- Cria: subjects, question_subjects, study_plans, study_sessions,
--       study_session_progress
-- NÃO altera questions, user_answers nem ai_explanations.
-- =============================================================

-- -------------------------------------------------------------
-- 1) subjects
-- -------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  discipline text not null,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (discipline, slug)
);

grant select on public.subjects to anon, authenticated;
grant all on public.subjects to service_role;

alter table public.subjects enable row level security;

drop policy if exists "Subjects are publicly readable" on public.subjects;
create policy "Subjects are publicly readable"
  on public.subjects for select
  to anon, authenticated
  using (true);

create index if not exists subjects_discipline_idx on public.subjects (discipline);

-- Seed das matérias
insert into public.subjects (discipline, name, slug) values
  ('matematica',        'Matemática',                 'matematica'),
  ('ciencias-natureza', 'Física',                     'fisica'),
  ('ciencias-natureza', 'Química',                    'quimica'),
  ('ciencias-natureza', 'Biologia',                   'biologia'),
  ('ciencias-humanas',  'História',                   'historia'),
  ('ciencias-humanas',  'Geografia',                  'geografia'),
  ('ciencias-humanas',  'Sociologia',                 'sociologia'),
  ('ciencias-humanas',  'Filosofia',                  'filosofia'),
  ('linguagens',        'Português',                  'portugues'),
  ('linguagens',        'Literatura',                 'literatura'),
  ('linguagens',        'Artes',                      'artes'),
  ('linguagens',        'Educação Física',            'educacao-fisica'),
  ('linguagens',        'Tecnologias da Informação',  'tecnologias-da-informacao'),
  ('linguagens',        'Língua Estrangeira',         'lingua-estrangeira')
on conflict (discipline, slug) do nothing;

-- -------------------------------------------------------------
-- 2) question_subjects
-- -------------------------------------------------------------
create table if not exists public.question_subjects (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  is_primary boolean not null default true,
  classified_by text not null default 'ai' check (classified_by in ('ai','manual')),
  created_at timestamptz not null default now(),
  unique (question_id, subject_id)
);

grant select on public.question_subjects to anon, authenticated;
grant all on public.question_subjects to service_role;

alter table public.question_subjects enable row level security;

drop policy if exists "Question subjects are publicly readable" on public.question_subjects;
create policy "Question subjects are publicly readable"
  on public.question_subjects for select
  to anon, authenticated
  using (true);
-- Sem policies de escrita: populado apenas por script/service_role.

create index if not exists question_subjects_question_id_idx on public.question_subjects (question_id);
create index if not exists question_subjects_subject_id_idx on public.question_subjects (subject_id);

-- -------------------------------------------------------------
-- 3) study_plans
-- -------------------------------------------------------------
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','archived')),
  generation_source text not null default 'manual'
    check (generation_source in ('manual','ai_initial','ai_regenerated')),
  valid_from date not null default current_date,
  valid_until date not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.study_plans to authenticated;
grant all on public.study_plans to service_role;

alter table public.study_plans enable row level security;

drop policy if exists "Users can view own plans" on public.study_plans;
create policy "Users can view own plans"
  on public.study_plans for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own plans" on public.study_plans;
create policy "Users can insert own plans"
  on public.study_plans for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own plans" on public.study_plans;
create policy "Users can update own plans"
  on public.study_plans for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plans" on public.study_plans;
create policy "Users can delete own plans"
  on public.study_plans for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists study_plans_user_id_idx on public.study_plans (user_id);
create index if not exists study_plans_user_status_idx on public.study_plans (user_id, status);

-- -------------------------------------------------------------
-- 4) study_sessions
-- -------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes integer not null,
  objective text not null,
  kind text not null,
  content jsonb not null default '[]'::jsonb,
  status text not null default 'todo' check (status in ('todo','active','done','skipped')),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;

alter table public.study_sessions enable row level security;

drop policy if exists "Users can view own sessions" on public.study_sessions;
create policy "Users can view own sessions"
  on public.study_sessions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.study_sessions;
create policy "Users can insert own sessions"
  on public.study_sessions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.study_sessions;
create policy "Users can update own sessions"
  on public.study_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.study_sessions;
create policy "Users can delete own sessions"
  on public.study_sessions for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists study_sessions_user_id_idx on public.study_sessions (user_id);
create index if not exists study_sessions_plan_id_idx on public.study_sessions (plan_id);
create index if not exists study_sessions_user_date_idx on public.study_sessions (user_id, scheduled_date);

-- -------------------------------------------------------------
-- 5) study_session_progress
-- -------------------------------------------------------------
create table if not exists public.study_session_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  questions_answered integer not null default 0,
  questions_correct integer not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.study_session_progress to authenticated;
grant all on public.study_session_progress to service_role;

alter table public.study_session_progress enable row level security;

drop policy if exists "Users can view own progress" on public.study_session_progress;
create policy "Users can view own progress"
  on public.study_session_progress for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.study_session_progress;
create policy "Users can insert own progress"
  on public.study_session_progress for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.study_session_progress;
create policy "Users can update own progress"
  on public.study_session_progress for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own progress" on public.study_session_progress;
create policy "Users can delete own progress"
  on public.study_session_progress for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists study_session_progress_session_id_idx on public.study_session_progress (session_id);
create index if not exists study_session_progress_user_id_idx on public.study_session_progress (user_id);
