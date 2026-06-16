-- FisioCareHub - Assinatura digital/eletrônica de documentos, triagens e prontuários
-- Fase 1: assinatura eletrônica interna pelo usuário logado.
-- Fase 2: hash SHA-256 + código/URL pública de verificação.
-- Fase 3: campos preparados para GOV.BR, ICP-Brasil, Clicksign, ZapSign, DocuSign ou outro provedor externo.

create extension if not exists pgcrypto;

create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  resource_title text,
  patient_id text,
  physio_id text,
  signer_id uuid not null references auth.users(id) on delete cascade,
  signer_role text not null check (signer_role in ('paciente', 'fisioterapeuta', 'admin', 'usuario')),
  signer_name text,
  signer_email text,
  signature_level text not null default 'avancada' check (signature_level in ('simples', 'avancada', 'qualificada_externa')),
  signature_status text not null default 'signed' check (signature_status in ('signed', 'pending_external', 'revoked', 'failed')),
  provider text default 'fisiocarehub',
  external_signature_id text,
  certificate_type text,
  document_hash text not null,
  consent_text text not null,
  verification_code text not null unique,
  verification_url text,
  user_agent text,
  ip_address inet,
  signed_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists document_signatures_unique_signer
  on public.document_signatures (resource_type, resource_id, signer_id, signer_role);

create index if not exists idx_document_signatures_resource
  on public.document_signatures (resource_type, resource_id);

create index if not exists idx_document_signatures_signer
  on public.document_signatures (signer_id, signer_role);

create index if not exists idx_document_signatures_patient
  on public.document_signatures (patient_id);

create index if not exists idx_document_signatures_physio
  on public.document_signatures (physio_id);

alter table public.document_signatures enable row level security;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Assinantes veem suas assinaturas" ON public.document_signatures;
DROP POLICY IF EXISTS "Pacientes e fisios veem assinaturas vinculadas" ON public.document_signatures;
DROP POLICY IF EXISTS "Usuarios autenticados assinam" ON public.document_signatures;
DROP POLICY IF EXISTS "Verificacao publica por codigo" ON public.document_signatures;

-- O assinante sempre vê o que assinou.
CREATE POLICY "Assinantes veem suas assinaturas" ON public.document_signatures
FOR SELECT USING (auth.uid() = signer_id);

-- Paciente/fisioterapeuta/admin veem assinaturas relacionadas ao seu vínculo.
CREATE POLICY "Pacientes e fisios veem assinaturas vinculadas" ON public.document_signatures
FOR SELECT USING (
  public.is_admin()
  OR auth.uid()::text = patient_id
  OR auth.uid()::text = physio_id
  OR EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE (
      p.id::text = document_signatures.patient_id
      OR p.perfil_id::text = document_signatures.patient_id
      OR p.id::text = document_signatures.resource_id
      OR p.perfil_id::text = document_signatures.resource_id
    )
    AND (
      p.fisioterapeuta_id::text = auth.uid()::text
      OR p.perfil_id::text = auth.uid()::text
    )
  )
);

-- Inserir/atualizar assinatura: somente usuário logado assinando por si mesmo.
CREATE POLICY "Usuarios autenticados assinam" ON public.document_signatures
FOR INSERT WITH CHECK (auth.uid() = signer_id);

CREATE POLICY "Usuarios atualizam suas assinaturas" ON public.document_signatures
FOR UPDATE USING (auth.uid() = signer_id)
WITH CHECK (auth.uid() = signer_id);

-- Campos opcionais para facilitar status direto nos documentos gerados.
alter table if exists public.documentos_gerados
  add column if not exists signature_status text default 'unsigned',
  add column if not exists patient_signed_at timestamptz,
  add column if not exists physio_signed_at timestamptz,
  add column if not exists last_signature_hash text,
  add column if not exists external_signature_provider text,
  add column if not exists external_signature_id text;

-- Tabela opcional de solicitações/convites de assinatura.
create table if not exists public.document_signature_requests (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  requested_by uuid references auth.users(id) on delete set null,
  requested_to uuid references auth.users(id) on delete set null,
  requested_to_email text,
  requested_role text check (requested_role in ('paciente', 'fisioterapeuta', 'admin', 'usuario')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'signed', 'cancelled', 'expired')),
  provider text default 'fisiocarehub',
  external_request_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_signature_requests enable row level security;

DROP POLICY IF EXISTS "Usuarios veem solicitacoes vinculadas" ON public.document_signature_requests;
DROP POLICY IF EXISTS "Usuarios criam solicitacoes" ON public.document_signature_requests;
DROP POLICY IF EXISTS "Usuarios atualizam solicitacoes" ON public.document_signature_requests;

CREATE POLICY "Usuarios veem solicitacoes vinculadas" ON public.document_signature_requests
FOR SELECT USING (
  public.is_admin()
  OR auth.uid() = requested_by
  OR auth.uid() = requested_to
);

CREATE POLICY "Usuarios criam solicitacoes" ON public.document_signature_requests
FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Usuarios atualizam solicitacoes" ON public.document_signature_requests
FOR UPDATE USING (auth.uid() = requested_by OR auth.uid() = requested_to)
WITH CHECK (auth.uid() = requested_by OR auth.uid() = requested_to);

-- Verificação pública segura por RPC: não libera SELECT amplo na tabela.
create or replace function public.verify_document_signature(p_code text)
returns table (
  id uuid,
  resource_type text,
  resource_id text,
  resource_title text,
  signer_role text,
  signer_name text,
  signer_email text,
  signature_level text,
  signature_status text,
  provider text,
  certificate_type text,
  document_hash text,
  verification_code text,
  verification_url text,
  signed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ds.id,
    ds.resource_type,
    ds.resource_id,
    ds.resource_title,
    ds.signer_role,
    ds.signer_name,
    ds.signer_email,
    ds.signature_level,
    ds.signature_status,
    ds.provider,
    ds.certificate_type,
    ds.document_hash,
    ds.verification_code,
    ds.verification_url,
    ds.signed_at,
    ds.created_at
  from public.document_signatures ds
  where ds.verification_code = p_code
  limit 1;
$$;

grant execute on function public.verify_document_signature(text) to anon, authenticated;
