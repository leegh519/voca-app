create table public.user_study_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_study_state enable row level security;

revoke all on table public.user_study_state from anon;
grant select, insert, update on table public.user_study_state to authenticated;

create policy "Users can read their own study state"
on public.user_study_state for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own study state"
on public.user_study_state for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own study state"
on public.user_study_state for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
