
-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.suporte_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) NOT NULL,
    categoria TEXT NOT NULL, -- 'assinatura', 'financeiro', 'tecnico', 'outro'
    assunto TEXT NOT NULL,
    descricao TEXT NOT NULL,
    status TEXT DEFAULT 'aberto', -- 'aberto', 'em_analise', 'resolvido', 'fechado'
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.suporte_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios tickets"
    ON public.suporte_tickets FOR SELECT
    USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar seus próprios tickets"
    ON public.suporte_tickets FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Admins podem ver todos os tickets"
    ON public.suporte_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid() AND tipo_usuario = 'admin'
        )
    );
