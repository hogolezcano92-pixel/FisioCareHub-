-- FisioCareHub - videochamada em tempo real quando o web app estiver aberto
-- Rode este arquivo no SQL Editor do Supabase antes de testar.

create table if not exists public.video_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.perfis(id) on delete cascade,
  receiver_id uuid not null references public.perfis(id) on delete cascade,
  caller_name text,
  receiver_name text,
  room_id text not null,
  title text,
  subtitle text,
  provider text not null default 'internal',
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index if not exists idx_video_calls_receiver_status
on public.video_calls(receiver_id, status, created_at desc);

create index if not exists idx_video_calls_caller_status
on public.video_calls(caller_id, status, created_at desc);

alter table public.video_calls enable row level security;

drop policy if exists "video_calls_select_participants" on public.video_calls;
create policy "video_calls_select_participants"
on public.video_calls
for select
to authenticated
using (
  auth.uid() = caller_id
  or auth.uid() = receiver_id
  or is_current_user_admin()
);

drop policy if exists "video_calls_insert_caller" on public.video_calls;
create policy "video_calls_insert_caller"
on public.video_calls
for insert
to authenticated
with check (
  auth.uid() = caller_id
);

drop policy if exists "video_calls_update_participants" on public.video_calls;
create policy "video_calls_update_participants"
on public.video_calls
for update
to authenticated
using (
  auth.uid() = caller_id
  or auth.uid() = receiver_id
  or is_current_user_admin()
)
with check (
  auth.uid() = caller_id
  or auth.uid() = receiver_id
  or is_current_user_admin()
);

drop policy if exists "video_calls_delete_admin" on public.video_calls;
create policy "video_calls_delete_admin"
on public.video_calls
for delete
to authenticated
using (
  is_current_user_admin()
);

grant select, insert, update on public.video_calls to authenticated;
grant all on public.video_calls to service_role;

-- Garante transmissão em tempo real para INSERT/UPDATE da tabela.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_calls'
  ) then
    alter publication supabase_realtime add table public.video_calls;
  end if;
end $$;

create or replace function public.touch_video_calls_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.answered_at is null then
    new.answered_at = now();
  end if;

  if new.status in ('ended', 'declined', 'missed') and old.status is distinct from new.status and new.ended_at is null then
    new.ended_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_touch_video_calls_updated_at on public.video_calls;
create trigger trg_touch_video_calls_updated_at
before update on public.video_calls
for each row
execute function public.touch_video_calls_updated_at();
