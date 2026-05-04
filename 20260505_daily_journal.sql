-- TABELA PARA REGISTROS DIÁRIOS DO PACIENTE (DIÁRIO DE DOR E ADESÃO)
CREATE TABLE IF NOT EXISTS public.registros_paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    nivel_dor INTEGER NOT NULL CHECK (nivel_dor >= 0 AND nivel_dor <= 10),
    exercicios_concluidos JSONB DEFAULT '[]'::jsonb, -- Array de objetos { name: string, completed: boolean }
    total_exercicios INTEGER DEFAULT 0,
    concluidos_count INTEGER DEFAULT 0,
    notas TEXT,
    visualizado_por_fisio BOOLEAN DEFAULT false,
    visualizado_em TIMESTAMP WITH TIME ZONE,
    data_registro DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.registros_paciente ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Pacientes gerenciam seus próprios registros" ON public.registros_paciente;
CREATE POLICY "Pacientes gerenciam seus próprios registros" ON public.registros_paciente
    FOR ALL USING (auth.uid() = paciente_id);

DROP POLICY IF EXISTS "Fisios veem registros de seus pacientes" ON public.registros_paciente;
CREATE POLICY "Fisios veem registros de seus pacientes" ON public.registros_paciente
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pacientes p
            JOIN public.perfis prof ON p.email = prof.email
            WHERE prof.id = registros_paciente.paciente_id
            AND p.fisioterapeuta_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Fisios atualizam status de visualização" ON public.registros_paciente;
CREATE POLICY "Fisios atualizam status de visualização" ON public.registros_paciente
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.pacientes p
            JOIN public.perfis prof ON p.email = prof.email
            WHERE prof.id = registros_paciente.paciente_id
            AND p.fisioterapeuta_id = auth.uid()
        )
    );

-- Criar índice para performance em buscas por paciente e data
CREATE INDEX IF NOT EXISTS idx_registros_paciente_data ON public.registros_paciente(paciente_id, data_registro);
