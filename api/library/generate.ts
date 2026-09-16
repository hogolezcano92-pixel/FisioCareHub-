import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

type EvaluationAIFields = {
  queixa_principal: string; historia_doenca_atual: string; historico_medico: string; medicamentos: string; antecedentes_familiares: string; habitos_vida: string; nivel_funcional: string; independencia_funcional: string; marcha: string; postura: string; inspecao: string; palpacao: string; amplitude_movimento: string; forca_muscular: string; escala_dor: number; testes_especiais: string; diagnostico_fisio: string; objetivos_terapeuticos: string; prognostico: string; conduta: string; frequencia_sessoes: string; observacoes_finais: string;
};

type ExamAnalysisAIResult = { exam_type: string; resumo_executivo: string; principais_achados: string[]; explicacao_para_paciente: string; pontos_para_fisioterapeuta_revisar: string[]; possiveis_relacoes_funcionais: string[]; sinais_de_alerta: string[]; limitacoes: string[]; recomendacao_segura: string; };

const FIELD_KEYS: Array<keyof EvaluationAIFields> = ['queixa_principal','historia_doenca_atual','historico_medico','medicamentos','antecedentes_familiares','habitos_vida','nivel_funcional','independencia_funcional','marcha','postura','inspecao','palpacao','amplitude_movimento','forca_muscular','escala_dor','testes_especiais','diagnostico_fisio','objetivos_terapeuticos','prognostico','conduta','frequencia_sessoes','observacoes_finais'];
const EXAM_ANALYSIS_KEYS: Array<keyof ExamAnalysisAIResult> = ['exam_type','resumo_executivo','principais_achados','explicacao_para_paciente','pontos_para_fisioterapeuta_revisar','possiveis_relacoes_funcionais','sinais_de_alerta','limitacoes','recomendacao_segura'];

// GPT-OSS 120B is the FisioCareHub's most capable configured reasoning/text model.
// Vision requests continue to use the dedicated vision models below because GPT-OSS 120B is text-only on Groq.
const TEXT_MODEL = 'openai/gpt-oss-120b';
const VISION_MODELS = ['qwen/qwen3.8-27b'];
const AI_TIMEOUT_MS = 40_000;
const MAX_IMAGE_DATA_URL_LENGTH = 4_500_000;
const MAX_EXAM_COMPLETION_TOKENS = 2500;
const HIGH_RISK_TERMS = ['fratura','luxação','luxacao','ruptura','tumor','neoplasia','infecção','infeccao','osteomielite','deslocamento','desviado','desviada'];
const CAUTION_TERMS = ['possível','possivel','sugestivo','sugere','suspeita','aparente','a confirmar','não é possível confirmar','nao e possivel confirmar','sem evidência clara','sem evidencia clara'];

const getEnv = (key: string, fallback = '') => { const value = process.env[key]; if (!value) return fallback; const trimmed = value.trim(); if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback; return trimmed; };
const normalizeSupabaseUrl = (value: string) => { const raw = value.trim().replace(/\/+$/, ''); if (!raw) return ''; if (/^https?:\/\//i.test(raw)) return raw; if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`; if (/^[a-z0-9-]+\.supabase\.co$/i.test(raw)) return `https://${raw}`; return raw; };
const sanitizeText = (value: unknown, maxLength = 1800) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
const sanitizeStringArray = (value: unknown, maxItems = 8, maxLength = 700) => !Array.isArray(value) ? [] : value.map((item) => sanitizeText(item, maxLength)).filter(Boolean).slice(0, maxItems);
const hasHighRiskTerm = (value: string) => HIGH_RISK_TERMS.some((term) => value.toLowerCase().includes(term));
const hasCautionTerm = (value: string) => CAUTION_TERMS.some((term) => value.toLowerCase().includes(term));
const softenHighRiskClaim = (value: string) => { const text = sanitizeText(value, 1200); if (!text) return ''; return hasHighRiskTerm(text) && !hasCautionTerm(text) ? `Possível achado a confirmar: ${text}. Necessita correlação com exame completo, outras incidências e laudo de profissional habilitado.` : text; };
const uniqueStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const normalizeAiFields = (raw: any): EvaluationAIFields => { const output: any = {}; for (const key of FIELD_KEYS) { if (key === 'escala_dor') { const n = Number(raw?.[key]); output[key] = Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n))) : 0; } else output[key] = sanitizeText(raw?.[key], 2500); } return output as EvaluationAIFields; };
const normalizeExamAnalysis = (raw: any): ExamAnalysisAIResult => {
  const rawResumo = sanitizeText(raw?.resumo_executivo, 2400); const rawExplicacao = sanitizeText(raw?.explicacao_para_paciente, 2400); const rawRecomendacao = sanitizeText(raw?.recomendacao_segura, 1800);
  const principaisAchados = sanitizeStringArray(raw?.principais_achados, 10, 800).map(softenHighRiskClaim); const sinaisDeAlerta = sanitizeStringArray(raw?.sinais_de_alerta, 8, 800).map(softenHighRiskClaim); const limitacoes = sanitizeStringArray(raw?.limitacoes, 8, 800);
  const hasRiskClaim = hasHighRiskTerm(rawResumo) || hasHighRiskTerm(rawExplicacao) || principaisAchados.some(hasHighRiskTerm) || sinaisDeAlerta.some(hasHighRiskTerm);
  const safetyLimitations = hasRiskClaim ? ['Achados graves, como fratura, luxação, ruptura, tumor ou infecção, não devem ser considerados confirmados por esta IA.','A análise visual por IA é limitada e exige revisão por radiologista, ortopedista ou profissional habilitado, especialmente em imagem única ou sem incidência AP/lateral completa.'] : [];
  return { exam_type: sanitizeText(raw?.exam_type, 160) || 'Exame não especificado', resumo_executivo: softenHighRiskClaim(rawResumo), principais_achados: uniqueStrings(principaisAchados).slice(0, 10), explicacao_para_paciente: softenHighRiskClaim(rawExplicacao), pontos_para_fisioterapeuta_revisar: sanitizeStringArray(raw?.pontos_para_fisioterapeuta_revisar, 10, 800), possiveis_relacoes_funcionais: sanitizeStringArray(raw?.possiveis_relacoes_funcionais, 8, 800), sinais_de_alerta: uniqueStrings(sinaisDeAlerta).slice(0, 8), limitacoes: uniqueStrings([...limitacoes, ...safetyLimitations]).slice(0, 10), recomendacao_segura: softenHighRiskClaim(rawRecomendacao) || 'Este pré-laudo é apenas apoio informativo. A interpretação final deve ser feita por profissional habilitado com o exame completo e avaliação clínica.' };
};

const getErrorMessage = (error: any) => { const raw = error?.response?.data?.error?.message || error?.error?.message || error?.message || String(error || ''); return typeof raw === 'string' ? raw : JSON.stringify(raw); };
const isPermissionOrModelError = (error: any) => { const message = getErrorMessage(error).toLowerCase(); return error?.status === 403 || error?.statusCode === 403 || message.includes('blocked') || message.includes('permission') || message.includes('model') || message.includes('not found') || message.includes('does not exist'); };
const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> => { let timeoutId: ReturnType<typeof setTimeout> | undefined; const timeoutPromise = new Promise<never>((_, reject) => { timeoutId = setTimeout(() => { const error = new Error('A análise visual demorou mais que o esperado. Tente uma imagem menor ou informe contexto clínico.'); (error as any).statusCode = 504; reject(error); }, timeoutMs); }); try { return await Promise.race([promise, timeoutPromise]); } finally { if (timeoutId) clearTimeout(timeoutId); } };

const getServerClients = async (accessToken?: string) => {
  const supabaseUrl = normalizeSupabaseUrl(getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL', 'https://exciqetztunqgxbwwodo.supabase.co')); const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY'); const groqApiKey = getEnv('GROQ_API_KEY') || getEnv('VITE_GROQ_API_KEY');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.'); if (!groqApiKey) throw new Error('GROQ_API_KEY não configurada no servidor.');
  let supabaseAdmin; try { supabaseAdmin = createClient(supabaseUrl, serviceRoleKey); } catch (error) { console.error('[AI API] Invalid Supabase URL:', supabaseUrl, error); throw new Error('URL do Supabase inválida. Configure VITE_SUPABASE_URL/SUPABASE_URL corretamente.'); }
  let authUserId = ''; if (accessToken) { const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken); if (authError || !authData.user) { const error = new Error('Sessão inválida ou expirada.'); (error as any).statusCode = 401; throw error; } authUserId = authData.user.id; }
  return { supabaseAdmin, groq: new Groq({ apiKey: groqApiKey }), authUserId };
};

async function completeEvaluationWithAi(req: VercelRequest, res: VercelResponse) {
  const { accessToken, pacienteId, notes, currentForm, patient } = req.body || {}; const safePacienteId = sanitizeText(pacienteId, 120); if (!accessToken || !safePacienteId) return res.status(400).json({ error: 'Sessão ou paciente não informado.' });
  const { supabaseAdmin, groq, authUserId: userId } = await getServerClients(accessToken); const { data: profile } = await supabaseAdmin.from('perfis').select('id, tipo_usuario, email').eq('id', userId).maybeSingle(); const isAdmin = profile?.tipo_usuario === 'admin' || profile?.email?.toLowerCase() === 'hogolezcano92@gmail.com';
  const { data: patientRecord, error: patientError } = await supabaseAdmin.from('pacientes').select('id, nome_completo, data_nascimento, telefone, fisioterapeuta_id').eq('id', safePacienteId).maybeSingle(); if (patientError) console.warn('[Evaluation AI API] Não foi possível validar paciente no backend:', patientError); if (patientRecord && !isAdmin && patientRecord.fisioterapeuta_id !== userId) return res.status(403).json({ error: 'Você não tem permissão para gerar ficha deste paciente.' });
  const safeNotes = sanitizeText(notes, 6000); const safeCurrentForm = FIELD_KEYS.reduce((acc: any, key) => { const value = currentForm?.[key]; acc[key] = key === 'escala_dor' ? Number(value || 0) : sanitizeText(value, 1200); return acc; }, {});
  const prompt = `Você é um assistente clínico para fisioterapeutas no Brasil. Organize uma ficha de avaliação fisioterapêutica a partir de texto livre e dados já preenchidos. Não invente achados; não dê diagnóstico médico fechado; diagnostico_fisio deve ser hipótese funcional para revisão; conduta deve ser sugestão inicial segura e revisável. Responda somente JSON válido.\nPACIENTE: ${JSON.stringify({ nome_completo: patientRecord?.nome_completo || patient?.nome_completo || '', data_nascimento: patientRecord?.data_nascimento || patient?.data_nascimento || '', telefone: patientRecord?.telefone || patient?.telefone || '' })}\nANOTAÇÕES: ${safeNotes || 'Sem anotações livres.'}\nCAMPOS: ${JSON.stringify(safeCurrentForm)}\nRetorne exatamente: ${JSON.stringify(FIELD_KEYS)}`;
  const completion = await withTimeout(groq.chat.completions.create({ model: TEXT_MODEL, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Você retorna somente JSON válido para preencher fichas fisioterapêuticas. Seja cauteloso e não invente dados.' }, { role: 'user', content: prompt }] }), 35_000);
  const content = completion.choices[0]?.message?.content; if (!content) return res.status(502).json({ error: 'A IA retornou uma resposta vazia.' }); const fields = normalizeAiFields(JSON.parse(content));
  return res.status(200).json({ success: true, fields, warning: patientRecord ? 'Conteúdo gerado por IA. Revise todos os campos antes de salvar no prontuário.' : 'Conteúdo gerado por IA sem validar dados do paciente no backend. Revise antes de salvar.' });
}

const buildExamPrompt = ({ profile, patientRecord, safePatientId, safePatientName, safeFileName, safeFileUrl, safeFileType, safeExamType, safeClinicalContext, safeExamText, hasImage }: any) => `Você é uma IA de apoio clínico do FisioCareHub para fisioterapeutas e pacientes no Brasil. Sua função é analisar exames, especialmente imagens musculoesqueléticas, para organizar achados observáveis e gerar um pré-laudo de apoio à revisão profissional. Você NÃO substitui radiologista, ortopedista ou fisioterapeuta e NÃO pode confirmar diagnóstico médico apenas pela imagem.

PROTOCOLO OBRIGATÓRIO PARA IMAGENS MUSCULOESQUELÉTICAS — ABCS:
A — ALINHAMENTO: identifique a região anatômica e a incidência quando realmente puder. Avalie eixo ósseo, congruência articular, subluxação ou luxação. Não invente incidência ou estrutura que não esteja visível.
B — BONES/OSSOS: faça uma varredura sistemática de TODAS as estruturas ósseas visíveis, cortical por cortical e ponta a ponta. Procure descontinuidade cortical, degrau, interrupção, angulação, impacção, fragmento ou outro sinal de possível fratura. Depois faça uma SEGUNDA VARREDURA independente procurando novamente fraturas, inclusive em regiões periféricas e sobrepostas. Uma sombra, sobreposição anatômica ou artefato não deve ser chamado de fratura sem evidência suficiente.
C — CARTILAGEM/ESPAÇO ARTICULAR: avalie espaço articular, redução assimétrica quando realmente visível, esclerose subcondral, osteófitos e outras alterações degenerativas observáveis. Não transforme uma pequena irregularidade em diagnóstico.
S — PARTES MOLES: descreva somente aumento de volume, derrame ou alteração de partes moles que sejam realmente perceptíveis na imagem. Lembre que radiografia tem limitação para tecidos moles.

ORDEM DE PRIORIDADE:
1. Segurança/trauma: primeiro procure desalinhamento importante e possível descontinuidade óssea.
2. Qualidade da imagem: avalie se a imagem está completa, focada, sem excesso de artefatos e se permite interpretação adequada.
3. ABCS completo.
4. Somente depois descreva alterações degenerativas ou outros achados.

REGRAS DE INCERTEZA:
- Diferencie rigorosamente "não visualizado", "sem evidência clara" e "alterado".
- Ausência de evidência na imagem NÃO significa ausência absoluta da lesão.
- Se a imagem estiver cortada, desfocada, muito pequena, com sobreposição importante, incidência desconhecida ou insuficiente para avaliar uma estrutura, declare a limitação.
- Se houver apenas uma incidência, não presuma que outras incidências existem.
- Se a qualidade não permitir avaliar com segurança um achado relevante, classifique a análise como limitada ou INCONCLUSIVA em vez de adivinhar.
- Não use o contexto clínico para forçar um achado que não é observável na imagem.
- Não invente medidas, graus, classificações, sinais radiológicos, incidências ou estruturas não demonstradas.

REGRAS DE TRAUMA E SEGURANÇA:
- Qualquer suspeita visual relevante de fratura, luxação, subluxação importante ou outro desalinhamento traumático deve aparecer em sinais_de_alerta como possibilidade a confirmar.
- NUNCA declare fratura, luxação, ruptura, tumor, infecção, osteomielite ou outra lesão grave como diagnóstico confirmado por uma imagem isolada.
- Se houver suspeita de trauma, NÃO recomende ADM/ROM, testes de força, testes especiais, carga, exercícios ou mobilização antes de avaliação médica adequada.
- Para suspeita traumática relevante, a recomendação segura deve priorizar proteção da região, evitar carga/manipulação e avaliação médica/ortopédica, conforme o contexto.
- Se não houver sinal traumático claro, não crie um alerta apenas por precaução.

REGRAS PARA ALTERAÇÕES DEGENERATIVAS:
- Só descreva osteófitos, esclerose, redução do espaço articular ou outras alterações quando houver suporte visual.
- Não transforme achados degenerativos em causa automática da dor ou limitação funcional.
- Relacione achados com função somente como possibilidade e sempre considerando avaliação clínica.

AUTO-REVISÃO OBRIGATÓRIA ANTES DA RESPOSTA:
1. Volte mentalmente à imagem e revise novamente as corticais ósseas.
2. Confira se algum achado grave foi afirmado como certeza; se sim, transforme em possibilidade a confirmar.
3. Confira se cada achado descrito é realmente visível.
4. Confira se a conclusão respeita a qualidade e as incidências disponíveis.
5. Se a imagem não permitir uma conclusão segura, use INCONCLUSIVO ou deixe explícita a limitação.
6. Nunca preencha uma lacuna com suposição.

CLASSIFICAÇÃO DO STATUS:
- NORMAL: não há alteração relevante claramente observável na imagem dentro das limitações do exame.
- ALTERACAO_DEGENERATIVA: há alterações degenerativas observáveis, sem sinal traumático relevante identificado.
- ALERTA_TRAUMA: há possível fratura, luxação, subluxação relevante ou outro achado traumático que exige confirmação profissional.
- INCONCLUSIVO: qualidade, cobertura, incidência ou sobreposição impedem avaliação confiável.

REGRAS GERAIS:
- Não faça diagnóstico médico definitivo.
- Diferencie achados observáveis de hipóteses.
- Não prescreva tratamento fechado.
- Seja específico, mas não invente detalhes.
- Responda somente JSON válido, sem markdown, sem texto antes ou depois do JSON.

DADOS: ${JSON.stringify({ usuario_logado: profile?.nome_completo || '', tipo_usuario: profile?.tipo_usuario || '', paciente: patientRecord?.nome_completo || safePatientName || '', patient_id: safePatientId || '' })}
ARQUIVO: ${JSON.stringify({ file_name: safeFileName, file_url: safeFileUrl, file_type: safeFileType, exam_type_informado: safeExamType, imagem_enviada_para_analise_visual: Boolean(hasImage) })}
CONTEXTO CLÍNICO: ${safeClinicalContext || 'Não informado.'}
TEXTO DO LAUDO: ${safeExamText || 'Não informado.'}
IMAGEM: ${hasImage ? 'Uma imagem foi enviada. A imagem é a fonte principal para os achados visuais. Analise-a diretamente seguindo o protocolo ABCS.' : 'Nenhuma imagem foi enviada; não faça análise visual e use somente texto/contexto, deixando isso explícito nas limitações.'}

Retorne exatamente este objeto JSON e mantenha estas chaves: {"exam_type":"...","resumo_executivo":"...","principais_achados":["..."],"explicacao_para_paciente":"...","pontos_para_fisioterapeuta_revisar":["..."],"possiveis_relacoes_funcionais":["..."],"sinais_de_alerta":["..."],"limitacoes":["..."],"recomendacao_segura":"..."}
Chaves permitidas: ${JSON.stringify(EXAM_ANALYSIS_KEYS)}`;

const extractJsonObject = (content: string) => { const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); try { return JSON.parse(trimmed); } catch { const start = trimmed.indexOf('{'); const end = trimmed.lastIndexOf('}'); if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)); throw new Error('A IA retornou um laudo em formato inválido. Tente novamente.'); } };

const createExamCompletion = async ({ groq, prompt, imageDataUrl }: { groq: Groq; prompt: string; imageDataUrl: string }) => {
  const systemMessage = { role: 'system', content: 'Você é uma IA de apoio à análise de exames. Retorne somente JSON válido. Para imagens musculoesqueléticas, siga rigorosamente o protocolo ABCS fornecido pelo usuário. Faça dupla revisão visual das corticais ósseas antes de concluir. Não invente achados, incidências ou medidas. Nunca confirme diagnóstico grave por imagem isolada. Suspeitas de fratura, luxação ou outro trauma devem ser descritas como possibilidade a confirmar e gerar revisão profissional obrigatória. Se a imagem for insuficiente, declare INCONCLUSIVO ou análise limitada.' };
  if (!imageDataUrl) return await withTimeout(groq.chat.completions.create({ model: TEXT_MODEL, temperature: 0.05, max_completion_tokens: MAX_EXAM_COMPLETION_TOKENS, response_format: { type: 'json_object' }, messages: [systemMessage, { role: 'user', content: prompt }] as any }), AI_TIMEOUT_MS);
  let lastError: any = null;
  for (const model of VISION_MODELS) {
    try { console.log(`[Exam AI API] Tentando modelo vision: ${model}`); return await withTimeout(groq.chat.completions.create({ model, temperature: 0.05, max_completion_tokens: MAX_EXAM_COMPLETION_TOKENS, response_format: { type: 'json_object' }, messages: [systemMessage, { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }] as any }), AI_TIMEOUT_MS); }
    catch (error: any) { lastError = error; console.warn(`[Exam AI API] Falha no modelo vision ${model}:`, getErrorMessage(error)); if (!isPermissionOrModelError(error)) throw error; }
  }
  const friendlyError = new Error(`Os modelos de visão da Groq não estão disponíveis neste projeto. Habilite ${VISION_MODELS[0]} na Groq ou tente informar contexto/laudo em texto.`); (friendlyError as any).statusCode = 403; (friendlyError as any).cause = lastError; throw friendlyError;
};

async function analyzeExamWithAi(req: VercelRequest, res: VercelResponse) {
  const { accessToken, examText, examType, fileName, fileUrl, patientId, patientName, clinicalContext, imageDataUrl, fileType } = req.body || {};
  const safeExamText = sanitizeText(examText, 16000); const safeClinicalContext = sanitizeText(clinicalContext, 5000); const safeFileName = sanitizeText(fileName, 300); const safeFileUrl = sanitizeText(fileUrl, 1000); const safeFileType = sanitizeText(fileType, 180);
  const safeImageDataUrl = typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/') && imageDataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH ? imageDataUrl : ''; const imageRejectedBySize = typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/') && imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH; const safeExamType = sanitizeText(examType, 180) || 'Exame/laudo clínico'; const safePatientId = sanitizeText(patientId, 120); const safePatientName = sanitizeText(patientName, 240);
  if (!accessToken) return res.status(400).json({ error: 'Sessão não informada.' }); if (imageRejectedBySize && !safeExamText && !safeClinicalContext) return res.status(413).json({ error: 'A imagem está grande demais para análise visual.', message: 'Envie uma imagem menor, tire um print mais leve ou comprima a foto antes de tentar novamente.' }); if (!safeImageDataUrl && !safeExamText && !safeClinicalContext) return res.status(400).json({ error: 'Envie uma imagem do exame ou informe um contexto clínico para a IA analisar.', message: 'A análise visual funciona com imagens. Para PDF puro, envie uma foto/print da página ou inclua um contexto clínico opcional.' });
  const { supabaseAdmin, groq, authUserId: userId } = await getServerClients(accessToken); const { data: profile } = await supabaseAdmin.from('perfis').select('id, tipo_usuario, email, nome_completo').eq('id', userId).maybeSingle(); if (!profile) return res.status(401).json({ error: 'Perfil do usuário não encontrado.' });
  let patientRecord: any = null; if (safePatientId) { const { data, error } = await supabaseAdmin.from('pacientes').select('id, nome_completo, fisioterapeuta_id').eq('id', safePatientId).maybeSingle(); if (error) console.warn('[Exam AI API] Não foi possível validar paciente no backend:', error); patientRecord = data; const isAdmin = profile?.tipo_usuario === 'admin' || profile?.email?.toLowerCase() === 'hogolezcano92@gmail.com'; const isPatientOwner = safePatientId === userId || patientRecord?.id === userId; const isLinkedPhysio = patientRecord?.fisioterapeuta_id === userId; if (patientRecord && !isAdmin && !isPatientOwner && !isLinkedPhysio) return res.status(403).json({ error: 'Você não tem permissão para analisar exames deste paciente.' }); }
  const prompt = buildExamPrompt({ profile, patientRecord, safePatientId, safePatientName, safeFileName, safeFileUrl, safeFileType, safeExamType, safeClinicalContext, safeExamText, hasImage: Boolean(safeImageDataUrl) }); const completion = await createExamCompletion({ groq, prompt, imageDataUrl: safeImageDataUrl }); const content = completion.choices[0]?.message?.content; if (!content) return res.status(502).json({ error: 'A IA retornou uma resposta vazia.' });
  let parsed: any; try { parsed = extractJsonObject(content); } catch (error: any) { console.error('[Exam AI API] Resposta inválida:', content.slice(0, 1000), error); const parseError = new Error(error?.message || 'A IA retornou um laudo em formato inválido.'); (parseError as any).statusCode = 502; throw parseError; }
  const analysis = normalizeExamAnalysis(parsed); if (!analysis.resumo_executivo && analysis.principais_achados.length === 0) return res.status(502).json({ error: 'A IA não produziu conteúdo clínico suficiente para gerar o pré-laudo.' });
  return res.status(200).json({ success: true, mode: 'exam_analysis', analysis, used_visual_analysis: Boolean(safeImageDataUrl), warning: 'Análise gerada por IA para apoio informativo. Não substitui avaliação, diagnóstico ou conduta de profissional habilitado.' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) { if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' }); try { if (req.body?.mode === 'evaluation_complete_with_ai') return await completeEvaluationWithAi(req, res); if (req.body?.mode === 'exam_analysis') return await analyzeExamWithAi(req, res); return res.status(403).json({ error: 'Geração automática de materiais por IA desativada.', message: 'Materiais da biblioteca devem ser criados, revisados e publicados manualmente pelo Admin.' }); } catch (error: any) { console.error('[AI API Error]', error); const statusCode = Number(error?.statusCode || error?.status || 500); return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ error: error?.message || 'Erro ao executar recurso de IA.' }); } }
