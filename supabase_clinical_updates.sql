-- FisioCareHub - Atualizações Clínicas automáticas
-- Rode este SQL no Supabase antes de ativar o carrossel/API em produção.

create table if not exists public.clinical_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  source text,
  source_url text,
  source_type text not null default 'pubmed',
  category text not null default 'Geral',
  external_id text not null unique,
  published_at timestamptz,
  image_url text,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinical_updates_published_date
  on public.clinical_updates (is_published, published_at desc nulls last);

create index if not exists idx_clinical_updates_category
  on public.clinical_updates (category);

alter table public.clinical_updates enable row level security;

drop policy if exists "clinical_updates_read_published" on public.clinical_updates;
create policy "clinical_updates_read_published"
  on public.clinical_updates
  for select
  to authenticated
  using (is_published = true);

-- Escrita/atualização deve ser feita pelo backend com SERVICE_ROLE_KEY.
-- Não crie policy de insert/update para usuários comuns.

create or replace function public.set_clinical_updates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinical_updates_updated_at on public.clinical_updates;
create trigger trg_clinical_updates_updated_at
before update on public.clinical_updates
for each row
execute function public.set_clinical_updates_updated_at();
