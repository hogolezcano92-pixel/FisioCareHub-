
-- 1. Tabela de Pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    data_nascimento DATE,
    endereco TEXT,
    diagnostico TEXT,
    observacoes TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Atendimentos
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    fisioterapeuta_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    tipo TEXT DEFAULT 'Presencial', -- 'Presencial', 'Online', 'Domiciliar'
    local TEXT,
    status TEXT DEFAULT 'agendado', -- 'agendado', 'realizado', 'cancelado'
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Evoluções
CREATE TABLE IF NOT EXISTS public.evolucoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE NOT NULL,
    dor_escala INTEGER CHECK (dor_escala >= 0 AND dor_escala <= 10),
    descricao TEXT,
    exercicios_realizados TEXT,
    observacoes TEXT,
    plano TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Arquivos do Paciente
CREATE TABLE IF NOT EXISTS public.arquivos_paciente (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    arquivo_url TEXT NOT NULL,
    tipo TEXT, -- 'Exame', 'Ressonância', 'Raio-X', 'Foto', 'Documento'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Exercícios (Biblioteca)
CREATE TABLE IF NOT EXISTS public.exercicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    series TEXT,
    repeticoes TEXT,
    video_url TEXT,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Exercícios do Paciente (Prescrição)
CREATE TABLE IF NOT EXISTS public.exercicios_paciente (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
    exercicio_id UUID REFERENCES public.exercicios(id) ON DELETE CASCADE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Habilitar RLS
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios_paciente ENABLE ROW LEVEL SECURITY;

-- 8. Políticas de Segurança (Fisioterapeutas veem apenas seus dados)

-- Pacientes
CREATE POLICY "Fisios gerenciam seus pacientes" ON public.pacientes
    FOR ALL USING (fisioterapeuta_id = auth.uid());

-- Atendimentos
CREATE POLICY "Fisios gerenciam seus atendimentos" ON public.atendimentos
    FOR ALL USING (fisioterapeuta_id = auth.uid());

-- Evoluções
CREATE POLICY "Fisios gerenciam evoluções" ON public.evolucoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.atendimentos 
            WHERE id = atendimento_id AND fisioterapeuta_id = auth.uid()
        )
    );

-- Arquivos
CREATE POLICY "Fisios gerenciam arquivos dos pacientes" ON public.arquivos_paciente
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pacientes 
            WHERE id = paciente_id AND fisioterapeuta_id = auth.uid()
        )
    );

-- Exercícios (Biblioteca é pública para leitura, mas só admin/fisio insere?)
-- Para simplificar, vamos permitir que fisios gerenciem a biblioteca
CREATE POLICY "Fisios gerenciam biblioteca de exercícios" ON public.exercicios
    FOR ALL USING (true);

-- Exercícios do Paciente
CREATE POLICY "Fisios gerenciam prescrições" ON public.exercicios_paciente
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pacientes 
            WHERE id = paciente_id AND fisioterapeuta_id = auth.uid()
        )
    );
