-- =========================================================
-- FisioCareHub - Oportunidades para Fisioterapeutas Pro
-- Fase 1: base de dados + segurança
-- Rode no Supabase SQL Editor do projeto principal.
-- =========================================================

-- 1) Solicitações publicadas pelos pacientes
CREATE TABLE IF NOT EXISTS public.solicitacoes_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  titulo text NOT NULL DEFAULT 'Solicitação de atendimento',
  descricao text,
  queixa_principal text NOT NULL,
  tipo_atendimento text NOT NULL DEFAULT 'ambos'
    CHECK (tipo_atendimento IN ('domicilio', 'online', 'ambos')),
  cidade text,
  estado text,
  bairro text,
  preferencia_horario text,

  -- Dados sensíveis ficam protegidos para evitar fechamento por fora.
  -- O contato deve ser feito pelo chat/agendamento interno.
  observacoes_privadas text,
  contato_liberado boolean NOT NULL DEFAULT false,

  visivel_para_profissionais boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em_negociacao', 'convertida', 'cancelada', 'encerrada')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Interesses enviados por fisioterapeutas Pro
CREATE TABLE IF NOT EXISTS public.interesses_solicitacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes_atendimento(id) ON DELETE CASCADE,
  fisio_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  mensagem text,
  status text NOT NULL DEFAULT 'enviado'
    CHECK (status IN ('enviado', 'visualizado', 'aceito', 'recusado', 'cancelado')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT interesses_solicitacao_unique UNIQUE (solicitacao_id, fisio_id)
);

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_atendimento_publicas
ON public.solicitacoes_atendimento (status, visivel_para_profissionais, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_atendimento_paciente
ON public.solicitacoes_atendimento (paciente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interesses_solicitacao_solicitacao
ON public.interesses_solicitacao (solicitacao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interesses_solicitacao_fisio
ON public.interesses_solicitacao (fisio_id, created_at DESC);

-- 4) Updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_solicitacoes_atendimento_updated_at ON public.solicitacoes_atendimento;
CREATE TRIGGER set_solicitacoes_atendimento_updated_at
BEFORE UPDATE ON public.solicitacoes_atendimento
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_interesses_solicitacao_updated_at ON public.interesses_solicitacao;
CREATE TRIGGER set_interesses_solicitacao_updated_at
BEFORE UPDATE ON public.interesses_solicitacao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Funções de permissão
CREATE OR REPLACE FUNCTION public.is_current_user_approved_pro_physio()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis p
    WHERE p.id = auth.uid()
      AND (
        p.tipo_usuario = 'fisioterapeuta'
        OR p.role = 'fisioterapeuta'
        OR p.tipo_usuario = 'physio'
        OR p.role = 'physio'
      )
      AND COALESCE(p.status_aprovacao, 'pendente') = 'aprovado'
      AND (
        COALESCE(p.plano, '') = 'pro'
        OR COALESCE(p.is_pro, false) = true
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() ->> 'email', '') = 'hogolezcano92@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.perfis p
      WHERE p.id = auth.uid()
        AND (p.tipo_usuario = 'admin' OR p.role = 'admin' OR p.plano = 'admin')
    );
$$;

-- 6) RLS
ALTER TABLE public.solicitacoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interesses_solicitacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitacoes_select_owner_pro_or_admin" ON public.solicitacoes_atendimento;
DROP POLICY IF EXISTS "solicitacoes_insert_owner" ON public.solicitacoes_atendimento;
DROP POLICY IF EXISTS "solicitacoes_update_owner_or_admin" ON public.solicitacoes_atendimento;
DROP POLICY IF EXISTS "solicitacoes_delete_owner_or_admin" ON public.solicitacoes_atendimento;

CREATE POLICY "solicitacoes_select_owner_pro_or_admin"
ON public.solicitacoes_atendimento
FOR SELECT
TO authenticated
USING (
  paciente_id = auth.uid()
  OR public.is_current_user_admin()
  OR (
    visivel_para_profissionais = true
    AND status = 'aberta'
    AND public.is_current_user_approved_pro_physio()
  )
);

CREATE POLICY "solicitacoes_insert_owner"
ON public.solicitacoes_atendimento
FOR INSERT
TO authenticated
WITH CHECK (paciente_id = auth.uid());

CREATE POLICY "solicitacoes_update_owner_or_admin"
ON public.solicitacoes_atendimento
FOR UPDATE
TO authenticated
USING (paciente_id = auth.uid() OR public.is_current_user_admin())
WITH CHECK (paciente_id = auth.uid() OR public.is_current_user_admin());

CREATE POLICY "solicitacoes_delete_owner_or_admin"
ON public.solicitacoes_atendimento
FOR DELETE
TO authenticated
USING (paciente_id = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS "interesses_select_related_or_admin" ON public.interesses_solicitacao;
DROP POLICY IF EXISTS "interesses_insert_pro_physio" ON public.interesses_solicitacao;
DROP POLICY IF EXISTS "interesses_update_related_or_admin" ON public.interesses_solicitacao;
DROP POLICY IF EXISTS "interesses_delete_owner_or_admin" ON public.interesses_solicitacao;

CREATE POLICY "interesses_select_related_or_admin"
ON public.interesses_solicitacao
FOR SELECT
TO authenticated
USING (
  fisio_id = auth.uid()
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.solicitacoes_atendimento s
    WHERE s.id = interesses_solicitacao.solicitacao_id
      AND s.paciente_id = auth.uid()
  )
);

CREATE POLICY "interesses_insert_pro_physio"
ON public.interesses_solicitacao
FOR INSERT
TO authenticated
WITH CHECK (
  fisio_id = auth.uid()
  AND public.is_current_user_approved_pro_physio()
  AND EXISTS (
    SELECT 1
    FROM public.solicitacoes_atendimento s
    WHERE s.id = interesses_solicitacao.solicitacao_id
      AND s.status = 'aberta'
      AND s.visivel_para_profissionais = true
  )
);

CREATE POLICY "interesses_update_related_or_admin"
ON public.interesses_solicitacao
FOR UPDATE
TO authenticated
USING (
  fisio_id = auth.uid()
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.solicitacoes_atendimento s
    WHERE s.id = interesses_solicitacao.solicitacao_id
      AND s.paciente_id = auth.uid()
  )
)
WITH CHECK (
  fisio_id = auth.uid()
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.solicitacoes_atendimento s
    WHERE s.id = interesses_solicitacao.solicitacao_id
      AND s.paciente_id = auth.uid()
  )
);

CREATE POLICY "interesses_delete_owner_or_admin"
ON public.interesses_solicitacao
FOR DELETE
TO authenticated
USING (fisio_id = auth.uid() OR public.is_current_user_admin());

-- 7) Comentários
COMMENT ON TABLE public.solicitacoes_atendimento IS
'Solicitações de pacientes visíveis para fisioterapeutas Pro. Não deve liberar contato direto antes do fluxo interno do app.';

COMMENT ON TABLE public.interesses_solicitacao IS
'Interesses enviados por fisioterapeutas Pro nas solicitações publicadas por pacientes.';
