-- FisioCareHub - Welcome Flow Migration
-- Adiciona campos para controle de boas-vindas e planos

ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS welcome_seen BOOLEAN DEFAULT false;

-- Garante que todos os fisioterapeutas tenham plano free por padrão se não definido
UPDATE public.perfis 
SET plano = 'free' 
WHERE tipo_usuario = 'fisioterapeuta' AND (plano IS NULL OR plano = 'basic');

-- COMENTÁRIO: 
-- A regra de negócio solicita que o usuário entre automaticamente no plano FREE após aprovação.
-- O campo 'aprovado' já existe na tabela 'perfis'.
