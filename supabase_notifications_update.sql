-- Adicionar coluna metadata nas notificações para ações (Confirmar/Recusar)
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Garantir que os status de agendamento existem logicamente (são strings)
-- 'pendente_pagamento', 'pago', 'confirmado', 'recusado'

-- Ajustar RLS se necessário (já deve estar ok pelo setup anterior)
