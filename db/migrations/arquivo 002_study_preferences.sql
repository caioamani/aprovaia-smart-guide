-- =============================================================
-- AprovaIA — preferências de estudo do usuário
-- Rode este arquivo no SQL Editor do SEU projeto Supabase.
-- Cria: study_preferences (1 linha por usuário)
-- =============================================================

create table if not exists public.study_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- Disponibilidade semanal: array de { day: 0-6 (0=segunda ... 6=domingo),
  -- start: "19:00", end: "21:00" }. Um dia sem entrada = usuário não estuda
  -- nesse dia.
  availability jsonb not null default '[]'::jsonb,
  notifications_enabled boolean not null default true,
  exam_date date,
  pace text not null default 'moderado' check (pace in ('leve', 'moderado', 'intenso')),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.study_preferences to authenticated;
grant all on public.study_preferences to service_role;

alter table public.study_preferences enable row level security;

drop policy if exists "Users can view own study preferences" on public.study_preferences;
create policy "Users can view own study preferences"
  on public.study_preferences for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own study preferences" on public.study_preferences;
create policy "Users can insert own study preferences"
  on public.study_preferences for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own study preferences" on public.study_preferences;
create policy "Users can update own study preferences"
  on public.study_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own study preferences" on public.study_preferences;
create policy "Users can delete own study preferences"
  on public.study_preferences for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists study_preferences_user_id_idx on public.study_preferences (user_id);

-- Mantém updated_at em dia a cada UPDATE.
create or replace function public.set_study_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_preferences_set_updated_at on public.study_preferences;
create trigger study_preferences_set_updated_at
  before update on public.study_preferences
  for each row
  execute function public.set_study_preferences_updated_at();
