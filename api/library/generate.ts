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

type ExamAnalysisAIResult = {
  exam_type: string;
  resumo_executivo: string;
  principais_achados: string[];
  explicacao_para_paciente: string;
  pontos_para_fisioterapeuta_revisar: string[];
  possiveis_relacoes_funcionais: string[];
  sinais_de_alerta: string[];
  limitacoes: string[];
  recomendacao_segura: string;
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

const EXAM_ANALYSIS_KEYS: Array<keyof ExamAnalysisAIResult> = [
  'exam_type',
  'resumo_executivo',
  'principais_achados',
  'explicacao_para_paciente',
  'pontos_para_fisioterapeuta_revisar',
  'possiveis_relacoes_funcionais',
  'sinais_de_alerta',
  'limitacoes',
  'recomendacao_segura',
];

const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

const AI_TIMEOUT_MS = 40_000;
const MAX_IMAGE_DATA_URL_LENGTH = 4_500_000;

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

const sanitizeStringArray = (value: unknown, maxItems = 8, maxLength = 700) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
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

const normalizeExamAnalysis = (raw: any): ExamAnalysisAIResult => ({
  exam_type: sanitizeText(raw?.exam_type, 160) || 'Exame não especificado',
  resumo_executivo: sanitizeText(raw?.resumo_executivo, 2400),
  principais_achados: sanitizeStringArray(raw?.principais_achados, 10, 800),
  explicacao_para_paciente: sanitizeText(raw?.explicacao_para_paciente, 2400),
  pontos_para_fisioterapeuta_revisar: sanitizeStringArray(raw?.pontos_para_fisioterapeuta_revisar, 10, 800),
  possiveis_relacoes_funcionais: sanitizeStringArray(raw?.possiveis_relacoes_funcionais, 8, 800),
  sinais_de_alerta: sanitizeStringArray(raw?.sinais_de_alerta, 8, 800),
  limitacoes: sanitizeStringArray(raw?.limitacoes, 8, 800),
  recomendacao_segura: sanitizeText(raw?.recomendacao_segura, 1800),
});

const getErrorMessage = (error: any) => {
  const raw =
    error?.response?.data?.error?.message ||
    error?.error?.message ||
    error?.message ||
    String(error || '');

  return typeof raw === 'string' ? raw : JSON.stringify(raw);
};

const isPermissionOrModelError = (error: any) => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    error?.status === 403 ||
    error?.statusCode === 403 ||
    message.includes('blocked') ||
    message.includes('permission') ||
    message.includes('model') ||
    message.includes('not found') ||
    message.includes('does not exist')
  );
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error('A análise visual demorou mais que o esperado. Tente uma imagem menor ou informe contexto clínico.');
      (error as any).statusCode = 504;
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getServerClients = async (accessToken?: string) => {
  const supabaseUrl = normalizeSupabaseUrl(
    getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL', 'https://exciqetztunqgxbwwodo.supabase.co')
  );
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = getEnv('GROQ_API_KEY') || getEnv('VITE_GROQ_API_KEY');

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.');
  }

  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY não configurada no servidor.');
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  } catch (error) {
    console.error('[AI API] Invalid Supabase URL:', supabaseUrl, error);
    throw new Error('URL do Supabase inválida. Configure VITE_SUPABASE_URL/SUPABASE_URL corretamente.');
  }

  let authUserId = '';
  if (accessToken) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      const error = new Error('Sessão inválida ou expirada.');
      (error as any).statusCode = 401;
      throw error;
    }

    authUserId = authData.user.id;
  }

  const groq = new Groq({ apiKey: groqApiKey });

  return { supabaseAdmin, groq, authUserId };
};

async function completeEvaluationWithAi(req: VercelRequest, res: VercelResponse) {
  const { accessToken, pacienteId, notes, currentForm, patient } = req.body || {};
  const safePacienteId = sanitizeText(pacienteId, 120);

  if (!accessToken || !safePacienteId) {
    return res.status(400).json({ error: 'Sessão ou paciente não informado.' });
  }

  const { supabaseAdmin, groq, authUserId: userId } = await getServerClients(accessToken);

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

  const completion = await withTimeout(
    groq.chat.completions.create({
      model: TEXT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Você retorna somente JSON válido para preencher fichas fisioterapêuticas. Você é cauteloso, não inventa dados e mantém revisão humana obrigatória.',
        },
        { role: 'user', content: prompt },
      ],
    }),
    35_000
  );

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

const buildExamPrompt = ({
  profile,
  patientRecord,
  safePatientId,
  safePatientName,
  safeFileName,
  safeFileUrl,
  safeFileType,
  safeExamType,
  safeClinicalContext,
  safeExamText,
  hasImage,
}: any) => `
Você é uma IA de apoio clínico do FisioCareHub para fisioterapeutas e pacientes no Brasil.
Sua função é analisar visualmente exames quando uma imagem for enviada, organizar os achados e gerar um pré-laudo/relatório de apoio para revisão profissional.

REGRAS OBRIGATÓRIAS:
- Não faça diagnóstico médico definitivo.
- Não diga "você tem" determinada doença.
- Use "a imagem sugere", "o material enviado mostra", "o texto informado sugere", "pode estar relacionado", "necessita correlação clínica".
- Não prescreva tratamento fechado.
- Não substitua médico, fisioterapeuta ou profissional habilitado.
- Se houver achado grave ou sinal de alerta no texto, oriente revisão com profissional habilitado.
- Se a imagem estiver limitada, com baixa qualidade, sem incidências suficientes ou sem texto, diga claramente que a análise é limitada.
- Responda apenas JSON válido, sem markdown.

DADOS DO USUÁRIO:
${JSON.stringify({
  usuario_logado: profile?.nome_completo || '',
  tipo_usuario: profile?.tipo_usuario || '',
  paciente: patientRecord?.nome_completo || safePatientName || '',
  patient_id: safePatientId || '',
})}

ARQUIVO:
${JSON.stringify({
  file_name: safeFileName,
  file_url: safeFileUrl,
  file_type: safeFileType,
  exam_type_informado: safeExamType,
  imagem_enviada_para_analise_visual: Boolean(hasImage),
})}

CONTEXTO CLÍNICO INFORMADO:
${safeClinicalContext || 'Não informado.'}

TEXTO DO LAUDO, SE HOUVER:
${safeExamText || 'Não informado.'}

INSTRUÇÃO SOBRE IMAGEM:
${hasImage ? 'Uma imagem do exame foi enviada. Analise visualmente a imagem com cautela e descreva apenas achados observáveis.' : 'Nenhuma imagem foi enviada para análise visual. Use apenas o texto/contexto informado.'}

Retorne exatamente este JSON:
{
  "exam_type": "tipo provável do exame, se informado ou inferido com cautela",
  "resumo_executivo": "pré-laudo de apoio curto e objetivo, descrevendo o que a imagem/texto mostra com cautela",
  "principais_achados": ["achado 1", "achado 2"],
  "explicacao_para_paciente": "explicação em linguagem simples, sem alarmismo",
  "pontos_para_fisioterapeuta_revisar": ["ponto 1", "ponto 2"],
  "possiveis_relacoes_funcionais": ["possível relação funcional 1", "possível relação funcional 2"],
  "sinais_de_alerta": ["sinal de alerta citado ou 'não informado no texto enviado'"],
  "limitacoes": ["limitação 1", "limitação 2"],
  "recomendacao_segura": "orientação segura dizendo que a análise é apoio e precisa de revisão profissional"
}

Chaves obrigatórias:
${JSON.stringify(EXAM_ANALYSIS_KEYS)}
`;

const createExamCompletion = async ({
  groq,
  prompt,
  imageDataUrl,
}: {
  groq: Groq;
  prompt: string;
  imageDataUrl: string;
}) => {
  const systemMessage = {
    role: 'system',
    content:
      'Você retorna somente JSON válido. Você é uma IA de apoio para analisar exames de forma cautelosa, sem diagnóstico definitivo, sem prescrição fechada e com revisão humana obrigatória.',
  };

  if (!imageDataUrl) {
    return await withTimeout(
      groq.chat.completions.create({
        model: TEXT_MODEL,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [systemMessage, { role: 'user', content: prompt }] as any,
      }),
      AI_TIMEOUT_MS
    );
  }

  let lastError: any = null;

  for (const model of VISION_MODELS) {
    try {
      console.log(`[Exam AI API] Tentando modelo vision: ${model}`);

      return await withTimeout(
        groq.chat.completions.create({
          model,
          temperature: 0.15,
          response_format: { type: 'json_object' },
          messages: [
            systemMessage,
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            },
          ] as any,
        }),
        AI_TIMEOUT_MS
      );
    } catch (error: any) {
      lastError = error;
      console.warn(`[Exam AI API] Falha no modelo vision ${model}:`, getErrorMessage(error));

      if (!isPermissionOrModelError(error)) {
        throw error;
      }
    }
  }

  const friendlyError = new Error(
    `Os modelos de visão da Groq não estão disponíveis neste projeto. Habilite ${VISION_MODELS[0]} na Groq ou tente informar contexto/laudo em texto.`
  );
  (friendlyError as any).statusCode = 403;
  (friendlyError as any).cause = lastError;
  throw friendlyError;
};

async function analyzeExamWithAi(req: VercelRequest, res: VercelResponse) {
  const {
    accessToken,
    examText,
    examType,
    fileName,
    fileUrl,
    patientId,
    patientName,
    clinicalContext,
    imageDataUrl,
    fileType,
  } = req.body || {};

  const safeExamText = sanitizeText(examText, 16000);
  const safeClinicalContext = sanitizeText(clinicalContext, 5000);
  const safeFileName = sanitizeText(fileName, 300);
  const safeFileUrl = sanitizeText(fileUrl, 1000);
  const safeFileType = sanitizeText(fileType, 180);

  const safeImageDataUrl =
    typeof imageDataUrl === 'string' &&
    imageDataUrl.startsWith('data:image/') &&
    imageDataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH
      ? imageDataUrl
      : '';

  const imageRejectedBySize =
    typeof imageDataUrl === 'string' &&
    imageDataUrl.startsWith('data:image/') &&
    imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH;

  const safeExamType = sanitizeText(examType, 180) || 'Exame/laudo clínico';
  const safePatientId = sanitizeText(patientId, 120);
  const safePatientName = sanitizeText(patientName, 240);

  if (!accessToken) {
    return res.status(400).json({ error: 'Sessão não informada.' });
  }

  if (imageRejectedBySize && !safeExamText && !safeClinicalContext) {
    return res.status(413).json({
      error: 'A imagem está grande demais para análise visual.',
      message: 'Envie uma imagem menor, tire um print mais leve ou comprima a foto antes de tentar novamente.',
    });
  }

  if (!safeImageDataUrl && !safeExamText && !safeClinicalContext) {
    return res.status(400).json({
      error: 'Envie uma imagem do exame ou informe um contexto clínico para a IA analisar.',
      message: 'A análise visual funciona com imagens. Para PDF puro, envie uma foto/print da página ou inclua um contexto clínico opcional.',
    });
  }

  const { supabaseAdmin, groq, authUserId: userId } = await getServerClients(accessToken);

  const { data: profile } = await supabaseAdmin
    .from('perfis')
    .select('id, tipo_usuario, email, nome_completo')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return res.status(401).json({ error: 'Perfil do usuário não encontrado.' });
  }

  let patientRecord: any = null;
  if (safePatientId) {
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome_completo, fisioterapeuta_id')
      .eq('id', safePatientId)
      .maybeSingle();

    if (error) {
      console.warn('[Exam AI API] Não foi possível validar paciente no backend:', error);
    }

    patientRecord = data;

    const isAdmin = profile?.tipo_usuario === 'admin' || profile?.email?.toLowerCase() === 'hogolezcano92@gmail.com';
    const isPatientOwner = safePatientId === userId || patientRecord?.id === userId;
    const isLinkedPhysio = patientRecord?.fisioterapeuta_id === userId;

    if (patientRecord && !isAdmin && !isPatientOwner && !isLinkedPhysio) {
      return res.status(403).json({ error: 'Você não tem permissão para analisar exames deste paciente.' });
    }
  }

  const prompt = buildExamPrompt({
    profile,
    patientRecord,
    safePatientId,
    safePatientName,
    safeFileName,
    safeFileUrl,
    safeFileType,
    safeExamType,
    safeClinicalContext,
    safeExamText,
    hasImage: Boolean(safeImageDataUrl),
  });

  const completion = await createExamCompletion({
    groq,
    prompt,
    imageDataUrl: safeImageDataUrl,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return res.status(502).json({ error: 'A IA retornou uma resposta vazia.' });
  }

  const parsed = JSON.parse(content);
  const analysis = normalizeExamAnalysis(parsed);

  return res.status(200).json({
    success: true,
    mode: 'exam_analysis',
    analysis,
    used_visual_analysis: Boolean(safeImageDataUrl),
    warning:
      'Análise gerada por IA para apoio informativo. Não substitui avaliação, diagnóstico ou conduta de profissional habilitado.',
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

    if (req.body?.mode === 'exam_analysis') {
      return await analyzeExamWithAi(req, res);
    }

    return res.status(403).json({
      error: 'Geração automática de materiais por IA desativada.',
      message: 'Materiais da biblioteca devem ser criados, revisados e publicados manualmente pelo Admin.',
    });
  } catch (error: any) {
    console.error('[AI API Error]', error);

    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({ error: error?.message || 'Erro ao executar recurso de IA.' });
  }
}
