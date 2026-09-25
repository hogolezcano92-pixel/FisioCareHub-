-- Structured physiotherapy evaluations
-- Applied to Supabase project exciqetztunqgxbwwodo on 2026-09-25.
ALTER TABLE public.fichas_avaliacao
  ADD COLUMN IF NOT EXISTS tipo_avaliacao text DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS dados_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cif_itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS testes_escalas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sinais_vitais jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_fichas_avaliacao_tipo
  ON public.fichas_avaliacao (fisioterapeuta_id, tipo_avaliacao, data_avaliacao DESC);

COMMENT ON COLUMN public.fichas_avaliacao.tipo_avaliacao IS 'Tipo clínico da avaliação.';
COMMENT ON COLUMN public.fichas_avaliacao.dados_especificos IS 'Dados estruturados específicos da especialidade.';
COMMENT ON COLUMN public.fichas_avaliacao.cif_itens IS 'Itens CIF selecionados na avaliação.';
COMMENT ON COLUMN public.fichas_avaliacao.testes_escalas IS 'Testes e escalas registrados na avaliação.';
COMMENT ON COLUMN public.fichas_avaliacao.sinais_vitais IS 'Sinais vitais estruturados da avaliação.';
