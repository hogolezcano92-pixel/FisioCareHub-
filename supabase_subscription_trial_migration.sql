-- FisioCareHub - campos necessários para Stripe + trial de 60 dias
-- Execute uma vez no SQL Editor do Supabase antes/depois do deploy do código corrigido.

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS card_exp_month INTEGER,
  ADD COLUMN IF NOT EXISTS card_exp_year INTEGER,
  ADD COLUMN IF NOT EXISTS trial_utilizado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stripe_sync TIMESTAMPTZ;

ALTER TABLE public.assinaturas
  DROP CONSTRAINT IF EXISTS assinaturas_status_check;

ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_status_check
  CHECK (status IN ('ativo', 'active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused', 'cancelado', 'canceled', 'expirado'));

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS plan_key TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS card_exp_month INTEGER,
  ADD COLUMN IF NOT EXISTS card_exp_year INTEGER,
  ADD COLUMN IF NOT EXISTS trial_utilizado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stripe_sync TIMESTAMPTZ;

-- A correção não exige UNIQUE(user_id), preservando bancos que já possuem histórico com mais de uma linha por usuário.
