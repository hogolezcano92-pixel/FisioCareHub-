-- Fluxo paciente com conta ativa ↔ paciente clínico do fisioterapeuta
-- Rode no Supabase: SQL Editor > New query > Run
-- Objetivo:
-- 1) Quando paciente com conta paga agenda, ele vira/vincula um registro em public.pacientes
-- 2) Esse paciente aparece em "Meus Pacientes" do fisioterapeuta
-- 3) A área do paciente consegue enxergar registros feitos pelo fisioterapeuta usando pacientes.id

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Colunas necessárias em pacientes
ALTER TABLE public.pacientes
ADD COLUMN IF NOT EXISTS perfil_id UUID,
ADD COLUMN IF NOT EXISTS tipo_paciente TEXT DEFAULT 'interno',
ADD COLUMN IF NOT EXISTS origem TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS diagnostico TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Evita duplicar o mesmo paciente com conta para o mesmo fisioterapeuta.
CREATE UNIQUE INDEX IF NOT EXISTS pacientes_fisio_perfil_unique
ON public.pacientes (fisioterapeuta_id, perfil_id)
WHERE perfil_id IS NOT NULL;

-- 2) Colunas necessárias em agendamentos para separar pagamento de confirmação clínica
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

UPDATE public.agendamentos
SET status_pagamento = CASE
  WHEN status IN ('confirmado', 'concluido', 'realizado') THEN 'pago'
  WHEN status = 'pendente_pagamento' THEN 'pendente'
  ELSE COALESCE(status_pagamento, 'pendente')
END
WHERE status_pagamento IS NULL;

-- 3) Policies para pacientes
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fisios visualizam seus pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Fisios criam seus pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Fisios atualizam seus pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Fisios apagam seus pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Pacientes visualizam seu vínculo clínico" ON public.pacientes;

CREATE POLICY "Fisios visualizam seus pacientes"
ON public.pacientes
FOR SELECT
USING (fisioterapeuta_id = auth.uid());

CREATE POLICY "Fisios criam seus pacientes"
ON public.pacientes
FOR INSERT
WITH CHECK (fisioterapeuta_id = auth.uid());

CREATE POLICY "Fisios atualizam seus pacientes"
ON public.pacientes
FOR UPDATE
USING (fisioterapeuta_id = auth.uid())
WITH CHECK (fisioterapeuta_id = auth.uid());

CREATE POLICY "Fisios apagam seus pacientes"
ON public.pacientes
FOR DELETE
USING (fisioterapeuta_id = auth.uid());

CREATE POLICY "Pacientes visualizam seu vínculo clínico"
ON public.pacientes
FOR SELECT
USING (perfil_id = auth.uid());

-- 4) Leitura do paciente com conta nos registros clínicos criados pelo fisioterapeuta
-- Exercícios rápidos prescritos em PatientDetails
ALTER TABLE public.exercicios_paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam seus exercicios prescritos" ON public.exercicios_paciente;

CREATE POLICY "Pacientes visualizam seus exercicios prescritos"
ON public.exercicios_paciente
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = exercicios_paciente.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Arquivos anexados em PatientDetails
ALTER TABLE public.arquivos_paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam seus arquivos clinicos" ON public.arquivos_paciente;

CREATE POLICY "Pacientes visualizam seus arquivos clinicos"
ON public.arquivos_paciente
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = arquivos_paciente.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Evoluções
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam suas evolucoes" ON public.evolucoes;

CREATE POLICY "Pacientes visualizam suas evolucoes"
ON public.evolucoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = evolucoes.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Fichas de avaliação
ALTER TABLE public.fichas_avaliacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam suas fichas de avaliacao" ON public.fichas_avaliacao;

CREATE POLICY "Pacientes visualizam suas fichas de avaliacao"
ON public.fichas_avaliacao
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = fichas_avaliacao.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Prontuários formais, quando fisio salvar paciente_id como pacientes.id
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam prontuarios por vinculo clinico" ON public.prontuarios;

CREATE POLICY "Pacientes visualizam prontuarios por vinculo clinico"
ON public.prontuarios
FOR SELECT
USING (
  paciente_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = prontuarios.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Protocolos, quando existirem prescrições por protocolo usando pacientes.id
ALTER TABLE public.protocolos_prescricao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam protocolos por vinculo clinico" ON public.protocolos_prescricao;

CREATE POLICY "Pacientes visualizam protocolos por vinculo clinico"
ON public.protocolos_prescricao
FOR SELECT
USING (
  paciente_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.pacientes p
    WHERE p.id = protocolos_prescricao.paciente_id
      AND p.perfil_id = auth.uid()
  )
);

-- Itens do protocolo: permite ler itens de protocolos visíveis ao paciente.
ALTER TABLE public.protocolo_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes visualizam itens dos seus protocolos" ON public.protocolo_itens;

CREATE POLICY "Pacientes visualizam itens dos seus protocolos"
ON public.protocolo_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.protocolos_prescricao pp
    LEFT JOIN public.pacientes p ON p.id = pp.paciente_id
    WHERE pp.id = protocolo_itens.protocolo_id
      AND (
        pp.paciente_id = auth.uid()
        OR p.perfil_id = auth.uid()
      )
  )
);

-- 5) Migração opcional de agendamentos já pagos/confirmados para Meus Pacientes.
-- Cria vínculo clínico para agendamentos existentes com paciente/fisio encontrados em perfis.
INSERT INTO public.pacientes (
  perfil_id,
  fisioterapeuta_id,
  nome_completo,
  email,
  telefone,
  data_nascimento,
  foto_url,
  avatar_url,
  tipo_paciente,
  origem,
  status,
  updated_at
)
SELECT DISTINCT ON (a.fisio_id, a.paciente_id)
  p.id AS perfil_id,
  a.fisio_id AS fisioterapeuta_id,
  COALESCE(p.nome_completo, 'Paciente') AS nome_completo,
  p.email,
  p.telefone,
  p.data_nascimento,
  COALESCE(p.foto_url, p.avatar_url),
  COALESCE(p.avatar_url, p.foto_url),
  'externo',
  'agendamento',
  'ativo',
  timezone('utc'::text, now())
FROM public.agendamentos a
JOIN public.perfis p ON p.id = a.paciente_id
WHERE a.paciente_id IS NOT NULL
  AND a.fisio_id IS NOT NULL
  AND (
    a.status IN ('pendente', 'confirmado', 'concluido', 'realizado')
    OR a.status_pagamento = 'pago'
  )
ON CONFLICT (fisioterapeuta_id, perfil_id)
WHERE perfil_id IS NOT NULL
DO UPDATE SET
  nome_completo = EXCLUDED.nome_completo,
  email = EXCLUDED.email,
  telefone = EXCLUDED.telefone,
  data_nascimento = EXCLUDED.data_nascimento,
  foto_url = COALESCE(EXCLUDED.foto_url, public.pacientes.foto_url),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.pacientes.avatar_url),
  tipo_paciente = 'externo',
  origem = COALESCE(public.pacientes.origem, 'agendamento'),
  status = 'ativo',
  updated_at = timezone('utc'::text, now());

NOTIFY pgrst, 'reload schema';

-- Conferência
SELECT
  id,
  nome_completo,
  email,
  perfil_id,
  fisioterapeuta_id,
  tipo_paciente,
  origem,
  status
FROM public.pacientes
WHERE tipo_paciente = 'externo'
ORDER BY updated_at DESC
LIMIT 20;
