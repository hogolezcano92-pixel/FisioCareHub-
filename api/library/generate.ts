import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

type EvaluationAIFields = {
  queixa_principal: string;
  historia_doenca_atual: string;
  historico_medico: string;
  medicamentos: string;
  antecedentes_familiares: string;
  habitos_vida: string;
  nivel_funcional: string;
  independencia_funcional: string;
  marcha: string;
  postura: string;
  inspecao: string;
  palpacao: string;
  amplitude_movimento: string;
  forca_muscular: string;
  escala_dor: number;
  testes_especiais: string;
  diagnostico_fisio: string;
  objetivos_terapeuticos: string;
  prognostico: string;
  conduta: string;
  frequencia_sessoes: string;
  observacoes_finais: string;
};

const FIELD_KEYS: Array<keyof EvaluationAIFields> = [
  'queixa_principal',
  'historia_doenca_atual',
  'historico_medico',
  'medicamentos',
  'antecedentes_familiares',
  'habitos_vida',
  'nivel_funcional',
  'independencia_funcional',
  'marcha',
  'postura',
  'inspecao',
  'palpacao',
  'amplitude_movimento',
  'forca_muscular',
  'escala_dor',
  'testes_especiais',
  'diagnostico_fisio',
  'objetivos_terapeuticos',
  'prognostico',
  'conduta',
  'frequencia_sessoes',
  'observacoes_finais',
];

const getEnv = (key: string, fallback = '') => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
};

const normalizeSupabaseUrl = (value: string) => {
  const raw = value.trim().replace(/\/+$/, '');
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  if (/^[a-z0-9-]+\.supabase\.co$/i.test(raw)) return `https://${raw}`;

  return raw;
};

const sanitizeText = (value: unknown, maxLength = 1800) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeAiFields = (raw: any): EvaluationAIFields => {
  const output: any = {};
  for (const key of FIELD_KEYS) {
    if (key === 'escala_dor') {
      const n = Number(raw?.[key]);
      output[key] = Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n))) : 0;
    } else {
      output[key] = sanitizeText(raw?.[key], 2500);
    }
  }
  return output as EvaluationAIFields;
};

async function completeEvaluationWithAi(req: VercelRequest, res: VercelResponse) {
  const { accessToken, pacienteId, notes, currentForm, patient } = req.body || {};
  const safePacienteId = sanitizeText(pacienteId, 120);

  if (!accessToken || !safePacienteId) {
    return res.status(400).json({ error: 'Sessão ou paciente não informado.' });
  }

  const supabaseUrl = normalizeSupabaseUrl(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL', 'https://exciqetztunqgxbwwodo.supabase.co')
  );
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = getEnv('GROQ_API_KEY') || getEnv('VITE_GROQ_API_KEY');

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  }

  if (!groqApiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY não configurada no servidor.' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  } catch (error) {
    console.error('[Evaluation AI API] Invalid Supabase URL:', supabaseUrl, error);
    return res.status(500).json({
      error: 'URL do Supabase inválida. Configure VITE_SUPABASE_URL/SUPABASE_URL como https://exciqetztunqgxbwwodo.supabase.co',
    });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  const userId = authData.user.id;

  const { data: profile } = await supabaseAdmin
    .from('perfis')
    .select('id, tipo_usuario, email')
    .eq('id', userId)
    .maybeSingle();

  const isAdmin = profile?.tipo_usuario === 'admin' || profile?.email?.toLowerCase() === 'hogolezcano92@gmail.com';

  const { data: patientRecord, error: patientError } = await supabaseAdmin
    .from('pacientes')
    .select('id, nome_completo, data_nascimento, telefone, fisioterapeuta_id')
    .eq('id', safePacienteId)
    .maybeSingle();

  // A IA só organiza texto para o fisioterapeuta revisar.
  // Se o paciente não for encontrado pelo backend por RLS/ambiente/preview,
  // não bloqueamos a IA; apenas seguimos sem dados sensíveis do paciente.
  // A gravação final continua protegida pelo Supabase/RLS no salvamento da ficha.
  if (patientError) {
    console.warn('[Evaluation AI API] Não foi possível validar paciente no backend:', patientError);
  }

  if (patientRecord && !isAdmin && patientRecord.fisioterapeuta_id !== userId) {
    return res.status(403).json({ error: 'Você não tem permissão para gerar ficha deste paciente.' });
  }

  const safeNotes = sanitizeText(notes, 6000);
  const safeCurrentForm = FIELD_KEYS.reduce((acc: any, key) => {
    const value = currentForm?.[key];
    acc[key] = key === 'escala_dor' ? Number(value || 0) : sanitizeText(value, 1200);
    return acc;
  }, {});

  const prompt = `
Você é um assistente clínico para fisioterapeutas no Brasil.
Sua tarefa é organizar uma ficha de avaliação fisioterapêutica a partir de texto livre e dados já preenchidos.

IMPORTANTE:
- Não invente achados que não foram informados.
- Quando algo não estiver claro, deixe o campo vazio ou use linguagem cautelosa como "não informado".
- Não dê diagnóstico médico fechado.
- O campo diagnostico_fisio deve ser uma hipótese/diagnóstico fisioterapêutico funcional para revisão do profissional.
- O campo conduta deve ser uma sugestão inicial segura, genérica e revisável pelo fisioterapeuta.
- Responda apenas em JSON válido, sem markdown.

PACIENTE CADASTRADO:
${JSON.stringify({
  nome_completo: patientRecord?.nome_completo || patient?.nome_completo || '',
  data_nascimento: patientRecord?.data_nascimento || patient?.data_nascimento || '',
  telefone: patientRecord?.telefone || patient?.telefone || '',
})}

ANOTAÇÕES LIVRES DO FISIOTERAPEUTA:
${safeNotes || 'Sem anotações livres. Use apenas os campos já preenchidos, se existirem.'}

CAMPOS JÁ PREENCHIDOS NA FICHA:
${JSON.stringify(safeCurrentForm)}

Retorne exatamente estes campos:
${JSON.stringify(FIELD_KEYS)}
`;

  const groq = new Groq({ apiKey: groqApiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Você retorna somente JSON válido para preencher fichas fisioterapêuticas. Você é cauteloso, não inventa dados e mantém revisão humana obrigatória.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return res.status(502).json({ error: 'A IA retornou uma resposta vazia.' });
  }

  const parsed = JSON.parse(content);
  const fields = normalizeAiFields(parsed);

  return res.status(200).json({
    success: true,
    fields,
    warning: patientRecord
      ? 'Conteúdo gerado por IA. Revise todos os campos antes de salvar no prontuário.'
      : 'Conteúdo gerado por IA sem validar dados do paciente no backend. Revise antes de salvar.',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    if (req.body?.mode === 'evaluation_complete_with_ai') {
      return await completeEvaluationWithAi(req, res);
    }

    return res.status(403).json({
      error: 'Geração automática de materiais por IA desativada.',
      message: 'Materiais da biblioteca devem ser criados, revisados e publicados manualmente pelo Admin.',
    });
  } catch (error: any) {
    console.error('[AI API Error]', error);
    return res.status(500).json({ error: error?.message || 'Erro ao executar recurso de IA.' });
  }
}
