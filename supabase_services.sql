-- Table for Financial Service Settings
CREATE TABLE IF NOT EXISTS public.configuracao_servicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    physio_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL UNIQUE,
    avaliacao_inicial NUMERIC(10, 2) DEFAULT 0,
    sessao_fisioterapia NUMERIC(10, 2) DEFAULT 0,
    reabilitacao NUMERIC(10, 2) DEFAULT 0,
    rpg NUMERIC(10, 2) DEFAULT 0,
    pilates NUMERIC(10, 2) DEFAULT 0,
    domiciliar NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.configuracao_servicos ENABLE ROW LEVEL SECURITY;

-- Policies for configuracao_servicos
CREATE POLICY "Profissionais gerenciam seus próprios valores" ON public.configuracao_servicos
    FOR ALL USING (auth.uid() = physio_id);

CREATE POLICY "Valores visíveis para todos" ON public.configuracao_servicos
    FOR SELECT USING (true);

-- Update agendamentos table
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS valor_cobrado NUMERIC(10, 2);
