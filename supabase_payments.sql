-- FISIOCAREHUB PAYMENTS SETUP
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. Adicionar colunas na tabela perfis
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS preco_sessao DECIMAL(10,2);
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- 2. Criar tabela sessoes
CREATE TABLE IF NOT EXISTS public.sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    agendamento_id BIGINT REFERENCES public.agendamentos(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    valor_sessao DECIMAL(10,2) NOT NULL,
    status_pagamento TEXT DEFAULT 'pendente', -- 'pendente', 'pago_app', 'pago_manual', 'cancelado'
    stripe_payment_intent TEXT,
    status_repasse TEXT DEFAULT 'pendente', -- 'pendente', 'repassado_fisio'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (RLS) para sessoes

-- Pacientes podem ver suas próprias sessões
CREATE POLICY "Pacientes podem ver suas próprias sessões" 
ON public.sessoes FOR SELECT 
USING (auth.uid() = paciente_id);

-- Fisioterapeutas podem ver suas próprias sessões
CREATE POLICY "Fisioterapeutas podem ver suas próprias sessões" 
ON public.sessoes FOR SELECT 
USING (auth.uid() = fisioterapeuta_id);

-- Admin pode ver todas
CREATE POLICY "Admin pode ver todas as sessões" 
ON public.sessoes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND (plano = 'admin' OR tipo_usuario = 'admin')
  )
);

-- Pacientes podem criar sessões (agendamento)
CREATE POLICY "Pacientes podem criar sessões" 
ON public.sessoes FOR INSERT 
WITH CHECK (auth.uid() = paciente_id);

-- Apenas o sistema (via service role ou webhook) deve atualizar o status, 
-- mas para simplificar o MVP, permitiremos que o dono ou admin atualize se necessário, 
-- embora o ideal seja via webhook.
CREATE POLICY "Admin e envolvidos podem atualizar sessões" 
ON public.sessoes FOR UPDATE 
USING (
  auth.uid() = paciente_id OR 
  auth.uid() = fisioterapeuta_id OR 
  EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = auth.uid() AND (plano = 'admin' OR tipo_usuario = 'admin')
  )
);
