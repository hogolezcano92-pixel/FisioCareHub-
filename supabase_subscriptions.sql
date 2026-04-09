-- FISIOCAREHUB SUBSCRIPTIONS SETUP
-- Execute este script no SQL Editor do seu projeto Supabase.

CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    plano TEXT NOT NULL DEFAULT 'pro',
    status TEXT NOT NULL CHECK (status IN ('ativo', 'cancelado', 'expirado')),
    valor NUMERIC NOT NULL DEFAULT 49.99,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_expiracao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Usuários veem suas próprias assinaturas" ON public.assinaturas
    FOR SELECT USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at_assinaturas
BEFORE UPDATE ON public.assinaturas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar coluna de limite de pacientes se não existir (opcional, podemos controlar via código)
-- ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS limite_pacientes INTEGER DEFAULT 5;
