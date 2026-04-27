-- FISIOCAREHUB PAGAMENTOS (TABLE FOR STRIPE & ASAAS)
-- Execute este script no SQL Editor do seu projeto Supabase.

CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE, -- ID do Stripe ou Asaas
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    external_reference TEXT, -- ID do agendamento ou plano
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    gateway TEXT NOT NULL, -- 'stripe', 'asaas'
    method TEXT, -- 'credit_card', 'pix', 'boleto'
    installment_count INTEGER DEFAULT 1,
    invoice_url TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Usuários veem seus próprios pagamentos" ON public.pagamentos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin vê todos os pagamentos" ON public.pagamentos
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() AND (plano = 'admin' OR tipo_usuario = 'admin')
      )
    );

-- Adicionar asaas_customer_id na tabela perfis
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
