
-- ADVANCED EXERCISE LIBRARY SCHEMA

-- 1. Updates to exercicios table
ALTER TABLE public.exercicios 
ADD COLUMN IF NOT EXISTS objetivo_principal TEXT,
ADD COLUMN IF NOT EXISTS objetivos_secundarios TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS categoria_principal TEXT,
ADD COLUMN IF NOT EXISTS subcategoria TEXT,
ADD COLUMN IF NOT EXISTS contexto_funcional TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS precaucoes TEXT,
ADD COLUMN IF NOT EXISTS dificuldade TEXT CHECK (dificuldade IN ('iniciante', 'intermediario', 'avancado')) DEFAULT 'iniciante',
ADD COLUMN IF NOT EXISTS indicacao_clinica TEXT;

-- 2. Prescription Protocol Tables
CREATE TABLE IF NOT EXISTS public.protocolos_prescricao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    observacoes_gerais TEXT,
    status TEXT DEFAULT 'ativo', -- 'ativo', 'arquivado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.protocolo_itens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    protocolo_id UUID REFERENCES public.protocolos_prescricao(id) ON DELETE CASCADE NOT NULL,
    exercicio_id BIGINT REFERENCES public.exercicios(id) ON DELETE CASCADE NOT NULL,
    series TEXT,
    repeticoes TEXT,
    carga TEXT,
    frequencia TEXT, -- Ex: 3x por semana
    observacoes_especificas TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.protocolos_prescricao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fisios gerenciam seus protocolos" ON public.protocolos_prescricao
    FOR ALL USING (auth.uid() = fisioterapeuta_id);

CREATE POLICY "Fisios gerenciam itens dos seus protocolos" ON public.protocolo_itens
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.protocolos_prescricao WHERE id = protocolo_id AND fisioterapeuta_id = auth.uid())
    );

-- Seed some base exercises if the table is empty (Logical check in JS)
