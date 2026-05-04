-- MIGRATION: IMPLEMENT CPF CONSTRAINTS AND INTEGRITY
-- Esse script garante que a coluna cpf_cnpj esteja pronta para uso com as regras de negócio solicitadas.

-- 1. Garantir que a coluna existe (caso não tenha sido criada por outros scripts)
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- 2. Limpeza de dados (opcional): Garantir que cpfs existentes sejam apenas números
-- UPDATE public.perfis SET cpf_cnpj = regexp_replace(cpf_cnpj, '\D', 'g') WHERE cpf_cnpj IS NOT NULL;

-- 3. Criar índice único para evitar CPFs duplicados
-- Nota: Usamos filter para ignorar valores nulos, permitindo que usuários não informem o CPF inicialmente
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_cpf_cnpj ON public.perfis (cpf_cnpj) WHERE (cpf_cnpj IS NOT NULL AND cpf_cnpj != '');

-- 4. Garantir que a view administrativa inclua o CPF
-- (A view admin_perfis_with_documents já puxa p.*, então o novo campo aparecerá automaticamente)

-- 5. Comentário para documentação
COMMENT ON COLUMN public.perfis.cpf_cnpj IS 'CPF ou CNPJ do usuário (apenas números) para validação fiscal e saques.';
