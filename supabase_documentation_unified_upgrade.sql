-- FisioCareHub - upgrade seguro da área de documentação/prontuário
-- Execute no Supabase SQL Editor antes/depois do deploy. Usa IF NOT EXISTS para não quebrar dados atuais.

alter table if exists public.documentos_gerados
  add column if not exists paciente_id uuid,
  add column if not exists visible_to_patient boolean not null default true,
  add column if not exists acceptance_required boolean not null default false,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid,
  add column if not exists acceptance_ip text,
  add column if not exists document_category text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.arquivos_paciente
  add column if not exists visible_to_patient boolean not null default true,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.evolucoes
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_documentos_gerados_paciente_id on public.documentos_gerados (paciente_id);
create index if not exists idx_documentos_gerados_patient_email on public.documentos_gerados (patient_email);
create index if not exists idx_documentos_gerados_visible on public.documentos_gerados (visible_to_patient);
create index if not exists idx_arquivos_paciente_visible on public.arquivos_paciente (visible_to_patient);

-- Backfill: tenta vincular documentos antigos por e-mail do paciente clínico.
update public.documentos_gerados dg
set paciente_id = p.id
from public.pacientes p
where dg.paciente_id is null
  and dg.patient_email is not null
  and p.email is not null
  and lower(trim(dg.patient_email)) = lower(trim(p.email));

-- Modelos que normalmente precisam de aceite simples do paciente.
update public.documentos_gerados
set acceptance_required = true
where coalesce(document_category, '') in ('contrato', 'autorizacao')
   or lower(coalesce(type, '')) like '%contrato%'
   or lower(coalesce(type, '')) like '%autorização%'
   or lower(coalesce(type, '')) like '%autorizacao%';
