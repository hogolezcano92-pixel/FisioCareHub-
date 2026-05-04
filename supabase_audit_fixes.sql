-- FISIOCAREHUB SYSTEM AUDIT & INTEGRITY FIXES
-- Este script corrige inconsistências de dados, tabelas ausentes e permissões administrativas.

-- 1. Criação de tabelas ausentes identificadas na análise
CREATE TABLE IF NOT EXISTS public.solicitacoes_saque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'recusado')),
    dados_bancarios JSONB DEFAULT '{}'::jsonb,
    processado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.suporte_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    assunto TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'resolvido', 'fechado')),
    prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notificacoes_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    link TEXT,
    tipo TEXT DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    agendamento_id BIGINT REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    status_atendimento TEXT DEFAULT 'agendado',
    status_pagamento TEXT DEFAULT 'pendente',
    valor_sessao DECIMAL(12,2) DEFAULT 0,
    evolucao_id UUID, -- Referência para evolução se existir
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para novas tabelas
ALTER TABLE public.solicitacoes_saque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suporte_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;

-- 3. Função Helper para verificar se o usuário é Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid() AND (tipo_usuario = 'admin' OR plano = 'admin')
        ) OR (
            (auth.jwt() ->> 'email') = 'hogolezcano92@gmail.com' AND (auth.jwt() ->> 'email_verified')::boolean = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualização de Políticas RLS para garantir acesso total ao administrador

-- PERFIS
DROP POLICY IF EXISTS "Usuários podem editar o próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem editar o próprio perfil" ON public.perfis FOR UPDATE USING (auth.uid() = id OR is_admin());

-- PACIENTES
DROP POLICY IF EXISTS "Fisios veem seus pacientes" ON public.pacientes;
CREATE POLICY "Fisios e Admins veem pacientes" ON public.pacientes FOR SELECT USING (auth.uid() = fisioterapeuta_id OR is_admin());
CREATE POLICY "Fisios e Admins gerenciam pacientes" ON public.pacientes FOR ALL USING (auth.uid() = fisioterapeuta_id OR is_admin());

-- AGENDAMENTOS
DROP POLICY IF EXISTS "Fisios gerenciam seus agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Pacientes podem ver seus agendamentos" ON public.agendamentos;
CREATE POLICY "Acesso completo para envolvidos e admins" ON public.agendamentos FOR ALL USING (auth.uid() = fisio_id OR auth.uid() = paciente_id OR is_admin());

-- SOLICITAÇÕES DE SAQUE
CREATE POLICY "Fisios veem seus saques" ON public.solicitacoes_saque FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Fisios criam saques" ON public.solicitacoes_saque FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins gerenciam saques" ON public.solicitacoes_saque FOR ALL USING (is_admin());

-- TIKETS DE SUPORTE
CREATE POLICY "Usuários veem seus tickets" ON public.suporte_tickets FOR SELECT USING (auth.uid() = usuario_id OR is_admin());
CREATE POLICY "Usuários criam tickets" ON public.suporte_tickets FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Admins gerenciam tickets" ON public.suporte_tickets FOR ALL USING (is_admin());

-- NOTIFICAÇÕES ADMIN
CREATE POLICY "Admins veem notificações admin" ON public.notificacoes_admin FOR SELECT USING (is_admin());
CREATE POLICY "Admins gerenciam notificações admin" ON public.notificacoes_admin FOR ALL USING (is_admin());

-- SESSÕES
CREATE POLICY "Envolvidos e Admins veem sessões" ON public.sessoes FOR SELECT USING (auth.uid() = paciente_id OR auth.uid() = fisioterapeuta_id OR is_admin());
CREATE POLICY "Admins gerenciam sessões" ON public.sessoes FOR ALL USING (is_admin());

-- TRIAGENS
DROP POLICY IF EXISTS "Fisios veem todas as triagens" ON public.triagens;
CREATE POLICY "Fisios e Admins veem triagens" ON public.triagens FOR SELECT USING (
    is_admin() OR 
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND tipo_usuario = 'fisioterapeuta')
);

-- 5. Criação da View Administrativa solicitada
-- Esta view garante que o admin veja todos os campos necessários sem restrições
CREATE OR REPLACE VIEW public.admin_perfis_with_documents AS
SELECT 
    p.*,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_app_meta_data,
    u.raw_user_meta_data
FROM public.perfis p
LEFT JOIN auth.users u ON p.id = u.id;

-- Garantir acesso à view
GRANT SELECT ON public.admin_perfis_with_documents TO authenticated;

-- 6. Garantia de persistência de campos obrigatórios
-- Adicionar triggers para validar integridade de dados se necessário, 
-- ou apenas garantir que as colunas existem com tipos corretos.

-- Adicionar colunas faltantes se houver
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS chave_pix TEXT;

-- 7. Atualização automática de updated_at para novas tabelas
CREATE TRIGGER set_updated_at_tickets
BEFORE UPDATE ON public.suporte_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Conclusão: Sistema auditado e políticas normalizadas.
