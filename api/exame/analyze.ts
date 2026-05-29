import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

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

const sanitizeText = (value: unknown, maxLength = 4000) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const sanitizeNullable = (value: unknown, maxLength = 4000) => {
  const text = sanitizeText(value, maxLength);
  return text || null;
};

const safeJsonParse = (value: string) => {
  try {
    const clean = value.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
};

const normalizeAnalysis = (raw: any) => ({
  resumo: sanitizeText(raw?.resumo, 3500) || 'Não foi possível gerar um resumo estruturado do exame enviado.',
  achados_principais: Array.isArray(raw?.achados_principais)
    ? raw.achados_principais.map((item: any) => sanitizeText(item, 600)).filter(Boolean).slice(0, 8)
    : [],
  pontos_atencao: Array.isArray(raw?.pontos_atencao)
    ? raw.pontos_atencao.map((item: any) => sanitizeText(item, 600)).filter(Boolean).slice(0, 8)
    : [],
  explicacao_paciente: sanitizeText(raw?.explicacao_paciente, 3500),
  orientacao_profissional: sanitizeText(raw?.orientacao_profissional, 3500),
  limitacoes: sanitizeText(raw?.limitacoes, 2000) || 'Análise gerada por IA para apoio. Não substitui avaliação clínica, laudo médico, diagnóstico ou conduta profissional.',
  sinais_alerta: Array.isArray(raw?.sinais_alerta)
    ? raw.sinais_alerta.map((item: any) => sanitizeText(item, 600)).filter(Boolean).slice(0, 8)
    : [],
  confianca: ['baixa', 'moderada', 'alta'].includes(String(raw?.confianca || '').toLowerCase())
    ? String(raw.confianca).toLowerCase()
    : 'moderada',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const {
      accessToken,
      fileUrl,
      fileName,
      fileType,
      imageDataUrl,
      examType,
      patientName,
      patientId,
      notes,
    } = req.body || {};

    if (!accessToken) {
      return res.status(401).json({ error: 'Sessão não informada.' });
    }

    const safeFileUrl = sanitizeText(fileUrl, 4000);
    const safeImageDataUrl = sanitizeText(imageDataUrl, 12_000_000);
    const safeFileName = sanitizeText(fileName, 300) || 'Exame enviado';
    const safeFileType = sanitizeText(fileType, 120) || 'arquivo';
    const safeExamType = sanitizeText(examType, 120) || 'Exame não informado';
    const safePatientName = sanitizeText(patientName, 180) || 'Paciente não informado';
    const safePatientId = sanitizeText(patientId, 120);
    const safeNotes = sanitizeText(notes, 8000);

    if (!safeFileUrl && !safeImageDataUrl && !safeNotes) {
      return res.status(400).json({ error: 'Envie um arquivo ou descreva o conteúdo do exame.' });
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const userId = authData.user.id;

    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('id, nome_completo, tipo_usuario, email')
      .eq('id', userId)
      .maybeSingle();

    const isPatient = profile?.tipo_usuario === 'paciente';
    const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
    const isAdmin = profile?.tipo_usuario === 'admin' || profile?.email?.toLowerCase() === 'hogolezcano92@gmail.com';

    if (!isPatient && !isPhysio && !isAdmin) {
      return res.status(403).json({ error: 'Perfil sem permissão para analisar exames.' });
    }

    const groq = new Groq({ apiKey: groqApiKey });
    const model = safeImageDataUrl
      ? (getEnv('GROQ_VISION_MODEL') || 'meta-llama/llama-4-scout-17b-16e-instruct')
      : (getEnv('GROQ_TEXT_MODEL') || 'llama-3.3-70b-versatile');

    const systemPrompt = `Você é uma IA de apoio para leitura e organização de exames no FisioCareHub.

REGRAS DE SEGURANÇA:
- Não faça diagnóstico médico definitivo.
- Não prescreva tratamento, medicação, cirurgia ou conduta fechada.
- Não diga "você tem"; diga "o laudo/imagem descreve" ou "pode sugerir, se confirmado por profissional".
- Diferencie o que foi observado no arquivo do que é inferência.
- Se a imagem estiver ilegível, informe limitação claramente.
- Sempre recomende correlação com avaliação clínica e profissional habilitado.
- Linguagem em português do Brasil.
- Responda SOMENTE em JSON válido.

FORMATO JSON OBRIGATÓRIO:
{
  "resumo": "Resumo curto e seguro do exame.",
  "achados_principais": ["achado 1", "achado 2"],
  "pontos_atencao": ["ponto para o fisioterapeuta revisar"],
  "explicacao_paciente": "Explicação simples e cuidadosa para paciente.",
  "orientacao_profissional": "Pontos técnicos para o fisioterapeuta considerar, sem conduta fechada.",
  "sinais_alerta": ["sinais que exigem avaliação médica se descritos no exame ou relato"],
  "limitacoes": "Limitações da análise e aviso de que não substitui avaliação profissional.",
  "confianca": "baixa | moderada | alta"
}`;

    const textPrompt = `DADOS DO ENVIO:
- Tipo de exame informado: ${safeExamType}
- Nome do arquivo: ${safeFileName}
- Tipo do arquivo: ${safeFileType}
- Paciente: ${safePatientName}
- Enviado por: ${profile?.nome_completo || 'usuário'} (${profile?.tipo_usuario || 'perfil não informado'})
- Observações/texto do laudo digitado: ${safeNotes || 'Não informado'}

TAREFA:
Analise o conteúdo disponível como apoio clínico/fisioterapêutico. Se for imagem, extraia texto visível e descreva achados legíveis. Se for PDF sem texto copiado, explique que a análise depende do texto/imagem legível enviada.`;

    const userContent: any = safeImageDataUrl
      ? [
          { type: 'text', text: textPrompt },
          { type: 'image_url', image_url: { url: safeImageDataUrl } },
        ]
      : textPrompt;

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ] as any,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'A IA retornou resposta vazia.' });
    }

    const parsed = safeJsonParse(content);
    if (!parsed) {
      return res.status(502).json({ error: 'A IA retornou um formato inválido.' });
    }

    const analysis = normalizeAnalysis(parsed);

    const recordPayload = {
      patient_id: isPatient ? userId : safePatientId || null,
      physio_id: isPhysio ? userId : null,
      uploaded_by: userId,
      patient_name: safePatientName,
      exam_type: safeExamType,
      file_name: safeFileName,
      file_type: safeFileType,
      file_url: safeFileUrl || null,
      status: 'completed',
      ai_summary: analysis.resumo,
      ai_findings: analysis.achados_principais,
      ai_attention_points: analysis.pontos_atencao,
      ai_patient_explanation: analysis.explicacao_paciente,
      ai_professional_notes: analysis.orientacao_profissional,
      ai_alerts: analysis.sinais_alerta,
      ai_limitations: analysis.limitacoes,
      ai_confidence: analysis.confianca,
      ai_raw_response: parsed,
    };

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('exam_analyses')
      .insert(recordPayload)
      .select('*')
      .single();

    if (saveError) {
      console.error('[Exam AI] Erro ao salvar análise:', saveError);
      return res.status(500).json({ error: 'Análise gerada, mas não foi possível salvar no prontuário.' });
    }

    return res.status(200).json({
      success: true,
      analysis,
      record: saved,
      warning: 'Análise gerada por IA para apoio. Revise com profissional habilitado. Não substitui diagnóstico, laudo ou consulta.',
    });
  } catch (error: any) {
    console.error('[Exam AI] Erro inesperado:', error);
    return res.status(500).json({ error: error?.message || 'Não foi possível analisar o exame no momento.' });
  }
}
