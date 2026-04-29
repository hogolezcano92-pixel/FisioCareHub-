
-- ADICIONA COLUNAS PARA PRECIFICAÇÃO DINÂMICA NA BIBLIOTECA
ALTER TABLE public.library_materials 
ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')) DEFAULT 'low',
ADD COLUMN IF NOT EXISTS topic TEXT;

-- COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.library_materials.price_cents IS 'Preço em centavos calculado pelo backend';
COMMENT ON COLUMN public.library_materials.complexity IS 'Nível de complexidade para cálculo de preço';
COMMENT ON COLUMN public.library_materials.topic IS 'Tema clínico principal';
