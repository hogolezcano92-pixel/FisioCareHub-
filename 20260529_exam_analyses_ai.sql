-- FisioCareHub - Análise Inteligente de Exames por IA
-- Rode no SQL Editor do Supabase antes de testar a tela /exam-ai.

create table if not exists public.exam_analyses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid null,
  physio_id uuid null,
  uploaded_by uuid not null references public.perfis(id) on delete cascade,
  patient_name text,
  exam_type text,
  file_name text,
  file_type text,
  file_url text,
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  ai_summary text,
  ai_findings text[] not null default '{}',
  ai_attention_points text[] not null default '{}',
  ai_patient_explanation text,
  ai_professional_notes text,
  ai_alerts text[] not null default '{}',
  ai_limitations text,
  ai_confidence text check (ai_confidence in ('baixa', 'moderada', 'alta')),
  ai_raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_analyses_uploaded_by_created
on public.exam_analyses(uploaded_by, created_at desc);

create index if not exists idx_exam_analyses_patient_id_created
on public.exam_analyses(patient_id, created_at desc);

create index if not exists idx_exam_analyses_physio_id_created
on public.exam_analyses(physio_id, created_at desc);

alter table public.exam_analyses enable row level security;

drop policy if exists exam_analyses_select_allowed on public.exam_analyses;
create policy exam_analyses_select_allowed
on public.exam_analyses
for select
to authenticated
using (
  uploaded_by = auth.uid()
  or patient_id = auth.uid()
  or physio_id = auth.uid()
  or is_current_user_admin()
);

drop policy if exists exam_analyses_insert_owner on public.exam_analyses;
create policy exam_analyses_insert_owner
on public.exam_analyses
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  or is_current_user_admin()
);

drop policy if exists exam_analyses_update_owner_or_admin on public.exam_analyses;
create policy exam_analyses_update_owner_or_admin
on public.exam_analyses
for update
to authenticated
using (
  uploaded_by = auth.uid()
  or physio_id = auth.uid()
  or is_current_user_admin()
)
with check (
  uploaded_by = auth.uid()
  or physio_id = auth.uid()
  or is_current_user_admin()
);

drop policy if exists exam_analyses_delete_owner_or_admin on public.exam_analyses;
create policy exam_analyses_delete_owner_or_admin
on public.exam_analyses
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or is_current_user_admin()
);

grant select, insert, update, delete on public.exam_analyses to authenticated;
grant all on public.exam_analyses to service_role;

create or replace function public.touch_exam_analyses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_exam_analyses_updated_at on public.exam_analyses;
create trigger trg_touch_exam_analyses_updated_at
before update on public.exam_analyses
for each row
execute function public.touch_exam_analyses_updated_at();

-- Bucket privado para armazenar exames.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-files',
  'exam-files',
  false,
  20971520,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

drop policy if exists exam_files_select_owner_or_admin on storage.objects;
create policy exam_files_select_owner_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exam-files'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or is_current_user_admin()
  )
);

drop policy if exists exam_files_insert_owner on storage.objects;
create policy exam_files_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exam-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists exam_files_delete_owner_or_admin on storage.objects;
create policy exam_files_delete_owner_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exam-files'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or is_current_user_admin()
  )
);
