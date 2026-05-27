import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type ClinicalUpdateInsert = {
  title: string;
  summary: string;
  source: string;
  source_url: string;
  source_type: 'pubmed' | 'gnews';
  category: string;
  external_id: string;
  published_at: string | null;
  image_url: string | null;
  image_key?: string | null;
  is_published: boolean;
  is_featured: boolean;
};

const getEnv = (key: string, fallback = '') => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
};

const SUPABASE_URL = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL'));
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const NCBI_API_KEY = getEnv('NCBI_API_KEY');
const GNEWS_API_KEY = getEnv('GNEWS_API_KEY');
const CRON_SECRET = getEnv('CRON_SECRET', getEnv('CLINICAL_UPDATES_SYNC_SECRET'));
const GROQ_API_KEY = getEnv('GROQ_API_KEY', getEnv('VITE_GROQ_API_KEY'));
const GROQ_MODEL = getEnv('GROQ_MODEL', 'llama-3.3-70b-versatile');

const ALLOWED_IMAGE_KEYS = [
  'neurologia',
  'neuro',
  'ortopedia',
  'geriatria',
  'respiratoria',
  'pelvica',
  'saude_mulher',
  'saude_homem',
  'dermato',
  'medicina_geral',
] as const;

type ClinicalImageKey = typeof ALLOWED_IMAGE_KEYS[number];

const isClinicalImageKey = (value: unknown): value is ClinicalImageKey =>
  ALLOWED_IMAGE_KEYS.includes(String(value || '') as ClinicalImageKey);


const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const PUBMED_QUERIES = [
  { term: 'physiotherapy rehabilitation', category: 'Reabilitação' },
  { term: 'physical therapy exercise therapy', category: 'Exercício terapêutico' },
  { term: 'low back pain rehabilitation physical therapy', category: 'Ortopedia' },
  { term: 'stroke rehabilitation physiotherapy', category: 'Neurológica' },
  { term: 'cardiorespiratory physiotherapy rehabilitation', category: 'Cardiorrespiratória' },
  { term: 'sports physiotherapy rehabilitation', category: 'Esportiva' },
];

const GNEWS_QUERIES = [
  { term: 'fisioterapia reabilitação', category: 'Fisioterapia' },
  { term: 'rehabilitation physical therapy', category: 'Reabilitação' },
];

const DEFAULT_IMAGES: Record<string, string> = {
  'Reabilitação': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
  'Exercício terapêutico': 'https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&q=80&w=1200',
  'Ortopedia': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200',
  'Neurológica': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80&w=1200',
  'Cardiorrespiratória': 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&q=80&w=1200',
  'Esportiva': 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=1200',
  'Geriatria': 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=1200',
  'Fisioterapia': 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&q=80&w=1200',
};

const stripHtml = (value: unknown, maxLength = 420) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalizeIfValid = (date: Date) => {
    if (Number.isNaN(date.getTime())) return null;

    // PubMed pode retornar datas futuras/ahead of print.
    // Evitamos salvar datas futuras para não confundir o fisioterapeuta no Dashboard.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() > tomorrow.getTime()) return new Date().toISOString();

    return date.toISOString();
  };

  const date = new Date(raw);
  const normalizedDate = normalizeIfValid(date);
  if (normalizedDate) return normalizedDate;

  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return normalizeIfValid(new Date(`${yearMatch[0]}-01-01T12:00:00.000Z`));

  return null;
};

const isSafeClinicalTopic = (title: string, summary = '') => {
  const text = `${title} ${summary}`.toLowerCase();
  const includeTerms = [
    'physiotherapy', 'physical therapy', 'rehabilitation', 'exercise therapy',
    'fisioterapia', 'reabilitação', 'therapeutic exercise', 'musculoskeletal',
    'stroke', 'low back pain', 'cardiorespiratory', 'sports', 'geriatric',
  ];
  const blockedTerms = ['weapon', 'gun', 'gambling', 'casino', 'porn', 'suicide'];

  return includeTerms.some((term) => text.includes(term)) && !blockedTerms.some((term) => text.includes(term));
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const adaptClinicalUpdateToPortuguese = async (item: ClinicalUpdateInsert): Promise<ClinicalUpdateInsert> => {
  if (!GROQ_API_KEY) return item;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 520,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Você é um editor científico do FisioCareHub para fisioterapeutas brasileiros.',
              'Traduza e adapte o conteúdo para português do Brasil, com linguagem profissional, clara e segura.',
              'Não invente achados, resultados, recomendações clínicas específicas nem dados que não estejam no texto.',
              'Não prometa cura e não transforme o conteúdo em orientação médica individual.',
              'Responda somente JSON válido no formato: {"title":"...","summary":"...","category":"...","image_key":"..."}.',
              'O title deve ter no máximo 110 caracteres.',
              'O summary deve ter no máximo 280 caracteres e explicar por que o tema interessa ao fisioterapeuta.',
              'A category deve ser uma destas: Reabilitação, Exercício terapêutico, Ortopedia, Neurológica, Cardiorrespiratória, Esportiva, Geriatria, Fisioterapia, Saúde da mulher, Saúde do homem, Saúde pélvica, Dermatofuncional, Medicina geral.',
              'A image_key deve ser obrigatoriamente uma destas: neurologia, neuro, ortopedia, geriatria, respiratoria, pelvica, saude_mulher, saude_homem, dermato, medicina_geral.',
              'Escolha image_key pelo tema clínico principal do artigo. Se tiver AVC, disfagia, marcha neurológica, Parkinson ou neuroplasticidade, prefira neurologia/neuro. Se for DPOC, pulmonar, respiração ou bicicleta monitorada, use respiratoria. Se for joelho, ombro, lombar, coluna, dor musculoesquelética ou artrose, use ortopedia. Se for idoso, quedas, sarcopenia ou fragilidade, use geriatria. Se for assoalho pélvico, incontinência ou dor pélvica, use pelvica. Se for gestação, pós-parto, menopausa, mama ou saúde feminina, use saude_mulher. Se for próstata, urologia masculina ou saúde masculina, use saude_homem. Se for pele, cicatriz, linfedema, queimadura, estética ou pós-operatório tegumentar, use dermato. Se não houver tema claro, use medicina_geral.'
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: item.title,
              summary: item.summary,
              category: item.category,
              source_type: item.source_type,
              source: item.source,
            }),
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) return item;

    const data: any = await response.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    const parsed = safeJsonParse(content);
    if (!parsed) return item;

    const title = stripHtml(parsed.title || item.title, 140);
    const summary = stripHtml(parsed.summary || item.summary, 340);
    const category = stripHtml(parsed.category || item.category, 80);
    const imageKey = isClinicalImageKey(parsed.image_key) ? String(parsed.image_key) : item.image_key || null;

    return {
      ...item,
      title: title || item.title,
      summary: summary || item.summary,
      category: category || item.category,
      image_key: imageKey,
    };
  } catch (error) {
    console.warn('[Clinical Updates Sync] Groq indisponível, usando conteúdo original:', error);
    return item;
  }
};

const adaptClinicalUpdatesToPortuguese = async (updates: ClinicalUpdateInsert[]) => {
  if (!GROQ_API_KEY || !updates.length) return updates;

  const adapted: ClinicalUpdateInsert[] = [];
  const batchSize = 3;

  for (let index = 0; index < updates.length; index += batchSize) {
    const batch = updates.slice(index, index + batchSize);
    const result = await Promise.all(batch.map((item) => adaptClinicalUpdateToPortuguese(item)));
    adapted.push(...result);
  }

  return adapted;
};

const fetchPubMed = async () => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of PUBMED_QUERIES) {
    const searchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    searchUrl.searchParams.set('db', 'pubmed');
    searchUrl.searchParams.set('term', `${query.term} AND (2024:2026[pdat])`);
    searchUrl.searchParams.set('retmode', 'json');
    searchUrl.searchParams.set('retmax', '4');
    searchUrl.searchParams.set('sort', 'pub date');
    if (NCBI_API_KEY) searchUrl.searchParams.set('api_key', NCBI_API_KEY);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) continue;

    const searchData: any = await searchResponse.json();
    const ids = searchData?.esearchresult?.idlist || [];
    if (!ids.length) continue;

    const summaryUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    summaryUrl.searchParams.set('db', 'pubmed');
    summaryUrl.searchParams.set('id', ids.join(','));
    summaryUrl.searchParams.set('retmode', 'json');
    if (NCBI_API_KEY) summaryUrl.searchParams.set('api_key', NCBI_API_KEY);

    const summaryResponse = await fetch(summaryUrl.toString());
    if (!summaryResponse.ok) continue;

    const summaryData: any = await summaryResponse.json();
    const result = summaryData?.result || {};

    for (const id of ids) {
      const item = result[id];
      if (!item?.title) continue;

      const title = stripHtml(item.title, 240);
      const source = stripHtml(item.source || 'PubMed', 120);
      const pubDate = normalizeDate(item.pubdate || item.epubdate || item.sortpubdate);
      const authors = Array.isArray(item.authors)
        ? item.authors.slice(0, 2).map((author: any) => author?.name).filter(Boolean).join(', ')
        : '';
      const summary = stripHtml(
        `${source}${authors ? ` • ${authors}` : ''}. Artigo científico indexado no PubMed sobre ${query.term}. Abra a fonte para conferir resumo, autores e detalhes metodológicos.`,
        420
      );

      if (!isSafeClinicalTopic(title, summary)) continue;

      updates.push({
        title,
        summary,
        source,
        source_url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source_type: 'pubmed',
        category: query.category,
        external_id: `pubmed:${id}`,
        published_at: pubDate,
        image_url: DEFAULT_IMAGES[query.category] || DEFAULT_IMAGES.Reabilitação,
        image_key: null,
        is_published: true,
        is_featured: query.category === 'Reabilitação' || query.category === 'Ortopedia',
      });
    }
  }

  return updates;
};

const fetchGNews = async () => {
  if (!GNEWS_API_KEY) return [] as ClinicalUpdateInsert[];

  const updates: ClinicalUpdateInsert[] = [];

  for (const query of GNEWS_QUERIES) {
    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.set('q', query.term);
    url.searchParams.set('lang', query.term.includes('fisioterapia') ? 'pt' : 'en');
    url.searchParams.set('country', query.term.includes('fisioterapia') ? 'br' : 'us');
    url.searchParams.set('max', '5');
    url.searchParams.set('apikey', GNEWS_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) continue;

    const data: any = await response.json();
    const articles = Array.isArray(data?.articles) ? data.articles : [];

    for (const article of articles) {
      const title = stripHtml(article.title, 240);
      const summary = stripHtml(article.description || article.content || '', 420);
      if (!title || !isSafeClinicalTopic(title, summary)) continue;

      updates.push({
        title,
        summary: summary || 'Notícia relacionada à fisioterapia e reabilitação. Abra a fonte para ler o conteúdo completo.',
        source: stripHtml(article.source?.name || 'GNews', 120),
        source_url: String(article.url || '').trim(),
        source_type: 'gnews',
        category: query.category,
        external_id: `gnews:${Buffer.from(String(article.url || title)).toString('base64url').slice(0, 80)}`,
        published_at: normalizeDate(article.publishedAt),
        // Usamos imagem clínica curada por categoria para evitar capas externas aleatórias
        // que não combinam com o tema do artigo/notícia no carrossel.
        image_url: DEFAULT_IMAGES[query.category] || DEFAULT_IMAGES.Fisioterapia,
        image_key: null,
        is_published: true,
        is_featured: false,
      });
    }
  }

  return updates;
};

const authorizeCronRequest = (req: VercelRequest) => {
  if (!CRON_SECRET) return false;

  const authorization = String(req.headers.authorization || '');
  const headerSecret = String(req.headers['x-cron-secret'] || '');
  const querySecret = typeof req.query.secret === 'string' ? req.query.secret : '';

  return authorization === `Bearer ${CRON_SECRET}` || headerSecret === CRON_SECRET || querySecret === CRON_SECRET;
};

const syncClinicalUpdates = async (req: VercelRequest, res: VercelResponse) => {
  if (!authorizeCronRequest(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized cron request. Configure CRON_SECRET na Vercel e teste com ?secret=SUA_SENHA.',
    });
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Supabase não configurado. Verifique SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    const [pubMedUpdates, newsUpdates] = await Promise.all([
      fetchPubMed(),
      fetchGNews(),
    ]);

    const uniqueMap = new Map<string, ClinicalUpdateInsert>();
    [...pubMedUpdates, ...newsUpdates].forEach((item) => {
      if (item.external_id && item.title) uniqueMap.set(item.external_id, item);
    });

    const updates = Array.from(uniqueMap.values()).slice(0, 24);

    if (!updates.length) {
      return res.status(200).json({ success: true, inserted: 0, message: 'Nenhum conteúdo novo encontrado.' });
    }

    const adaptedUpdates = await adaptClinicalUpdatesToPortuguese(updates);

    const { data, error } = await supabase
      .from('clinical_updates')
      .upsert(adaptedUpdates, { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id, external_id');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      inserted: data?.length || 0,
      translated_with_groq: Boolean(GROQ_API_KEY),
      sources: {
        pubmed: pubMedUpdates.length,
        gnews: newsUpdates.length,
      },
    });
  } catch (error: any) {
    console.error('[Clinical Updates Sync] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao sincronizar atualizações clínicas.',
    });
  }
};

const handleWhatsappHealthcheck = async (request: VercelRequest, response: VercelResponse) => {
  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    });
  }

  try {
    return response.status(200).json({
      success: true,
      message: 'API WhatsApp funcionando',
    });
  } catch (error: any) {
    return response.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // IMPORTANTE: esta função foi reaproveitada para não passar do limite de 12 Serverless Functions no plano Hobby da Vercel.
  // GET = sincronização automática de Atualizações Clínicas via Cron.
  // POST = mantém o teste antigo da API WhatsApp.
  if (request.method === 'GET') {
    return syncClinicalUpdates(request, response);
  }

  return handleWhatsappHealthcheck(request, response);
}
