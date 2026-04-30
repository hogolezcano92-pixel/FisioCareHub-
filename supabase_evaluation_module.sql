
-- EVALUATION FORM TABLE
CREATE TABLE IF NOT EXISTS public.fichas_avaliacao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    
    -- ANAMNESE
    queixa_principal TEXT,
    historia_doenca_atual TEXT,
    historico_medico TEXT,
    medicamentos TEXT,
    antecedentes_familiares TEXT,
    habitos_vida TEXT,
    
    -- AVALIAÇÃO FUNCIONAL
    nivel_funcional TEXT,
    independencia_funcional TEXT,
    marcha TEXT,
    postura TEXT,
    
    -- EXAME FÍSICO
    inspecao TEXT,
    palpacao TEXT,
    amplitude_movimento TEXT,
    forca_muscular TEXT,
    escala_dor INTEGER DEFAULT 0,
    
    -- TESTES ESPECIAIS
    testes_especiais TEXT,
    
    -- RACIOCÍNIO CLÍNICO
    diagnostico_fisio TEXT,
    objetivos_terapeuticos TEXT,
    prognostico TEXT,
    
    -- PLANO
    conduta TEXT,
    frequencia_sessoes TEXT,
    observacoes_finais TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.fichas_avaliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fisios gerenciam suas fichas de avaliacao" ON public.fichas_avaliacao
    FOR ALL USING (auth.uid() = fisioterapeuta_id);
    
-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fichas_avaliacao_updated_at 
    BEFORE UPDATE ON public.fichas_avaliacao 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
