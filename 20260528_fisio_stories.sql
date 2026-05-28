-- FisioCareHub - FisioStories
-- Execute este SQL no Supabase antes de usar a funcionalidade de stories.

create extension if not exists pgcrypto;

create table if not exists public.fisio_stories (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.perfis(id) on delete cascade,
  title text,
  caption text,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  cta_type text default 'profile',
  cta_label text default 'Ver perfil',
  cta_url text,
  status text not null default 'active' check (status in ('active', 'pending', 'blocked', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  views_count integer not null default 0,
  clicks_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fisio_stories_active on public.fisio_stories (status, expires_at desc, created_at desc);
create index if not exists idx_fisio_stories_physio on public.fisio_stories (physio_id, created_at desc);

create table if not exists public.fisio_story_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.fisio_stories(id) on delete cascade,
  viewer_id uuid null references public.perfis(id) on delete set null,
  event_type text not null check (event_type in ('view', 'click', 'report')),
  created_at timestamptz not null default now()
);

create index if not exists idx_fisio_story_events_story on public.fisio_story_events (story_id, event_type, created_at desc);
create index if not exists idx_fisio_story_events_viewer on public.fisio_story_events (viewer_id, created_at desc);

alter table public.fisio_stories enable row level security;
alter table public.fisio_story_events enable row level security;

create or replace function public.fisio_stories_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or p.tipo_usuario = 'admin'
        or lower(coalesce(p.email, '')) = 'hogolezcano92@gmail.com'
      )
  );
$$;

create or replace function public.set_fisio_story_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fisio_stories_updated_at on public.fisio_stories;
create trigger trg_fisio_stories_updated_at
before update on public.fisio_stories
for each row execute function public.set_fisio_story_updated_at();

drop policy if exists "Stories ativos são públicos" on public.fisio_stories;
create policy "Stories ativos são públicos"
on public.fisio_stories
for select
to anon, authenticated
using (status = 'active' and expires_at > now());

drop policy if exists "Fisioterapeuta vê todos os próprios stories" on public.fisio_stories;
create policy "Fisioterapeuta vê todos os próprios stories"
on public.fisio_stories
for select
to authenticated
using (physio_id = auth.uid());

drop policy if exists "Admin vê todos os stories" on public.fisio_stories;
create policy "Admin vê todos os stories"
on public.fisio_stories
for select
to authenticated
using (public.fisio_stories_is_admin());

drop policy if exists "Fisioterapeuta cria story próprio" on public.fisio_stories;
create policy "Fisioterapeuta cria story próprio"
on public.fisio_stories
for insert
to authenticated
with check (
  physio_id = auth.uid()
  and exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.tipo_usuario = 'fisioterapeuta'
      and coalesce(p.status_aprovacao, 'aprovado') = 'aprovado'
  )
);

drop policy if exists "Fisioterapeuta atualiza story próprio" on public.fisio_stories;
create policy "Fisioterapeuta atualiza story próprio"
on public.fisio_stories
for update
to authenticated
using (physio_id = auth.uid())
with check (physio_id = auth.uid());

drop policy if exists "Fisioterapeuta remove story próprio" on public.fisio_stories;
create policy "Fisioterapeuta remove story próprio"
on public.fisio_stories
for delete
to authenticated
using (physio_id = auth.uid());

drop policy if exists "Admin gerencia todos os stories" on public.fisio_stories;
create policy "Admin gerencia todos os stories"
on public.fisio_stories
for all
to authenticated
using (public.fisio_stories_is_admin())
with check (public.fisio_stories_is_admin());

drop policy if exists "Qualquer visitante registra evento de story ativo" on public.fisio_story_events;
create policy "Qualquer visitante registra evento de story ativo"
on public.fisio_story_events
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.fisio_stories s
    where s.id = story_id and s.status = 'active' and s.expires_at > now()
  )
);

drop policy if exists "Fisioterapeuta vê eventos dos próprios stories" on public.fisio_story_events;
create policy "Fisioterapeuta vê eventos dos próprios stories"
on public.fisio_story_events
for select
to authenticated
using (
  exists (select 1 from public.fisio_stories s where s.id = story_id and s.physio_id = auth.uid())
);

drop policy if exists "Admin vê eventos de stories" on public.fisio_story_events;
create policy "Admin vê eventos de stories"
on public.fisio_story_events
for select
to authenticated
using (public.fisio_stories_is_admin());

create or replace function public.increment_fisio_story_views(story_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fisio_stories
  set views_count = views_count + 1, updated_at = now()
  where id = story_id_input and status = 'active' and expires_at > now();
end;
$$;

create or replace function public.increment_fisio_story_clicks(story_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fisio_stories
  set clicks_count = clicks_count + 1, updated_at = now()
  where id = story_id_input and status = 'active' and expires_at > now();
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fisio-stories',
  'fisio-stories',
  true,
  83886080,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Stories storage público leitura" on storage.objects;
create policy "Stories storage público leitura"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'fisio-stories');

drop policy if exists "Fisioterapeuta envia stories próprios" on storage.objects;
create policy "Fisioterapeuta envia stories próprios"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'fisio-stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fisioterapeuta atualiza storage stories próprios" on storage.objects;
create policy "Fisioterapeuta atualiza storage stories próprios"
on storage.objects
for update
to authenticated
using (bucket_id = 'fisio-stories' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'fisio-stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Fisioterapeuta remove storage stories próprios" on storage.objects;
create policy "Fisioterapeuta remove storage stories próprios"
on storage.objects
for delete
to authenticated
using (bucket_id = 'fisio-stories' and (storage.foldername(name))[1] = auth.uid()::text);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.fisio_stories to anon, authenticated;
grant insert, update, delete on public.fisio_stories to authenticated;
grant select, insert on public.fisio_story_events to anon, authenticated;
grant all on public.fisio_stories to service_role;
grant all on public.fisio_story_events to service_role;
grant execute on function public.fisio_stories_is_admin() to authenticated, service_role;
grant execute on function public.increment_fisio_story_views(uuid) to anon, authenticated, service_role;
grant execute on function public.increment_fisio_story_clicks(uuid) to anon, authenticated, service_role;
