-- FisioCareHub - Plan Intro Flow Migration
-- Adiciona campo para controle de visualização da tela de planos

ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS plan_intro_seen BOOLEAN DEFAULT false;
