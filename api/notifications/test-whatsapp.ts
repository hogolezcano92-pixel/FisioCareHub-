import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type ClinicalSourceType = 'pubmed' | 'gnews' | 'europepmc' | 'crossref';

type ClinicalUpdateInsert = {
  title: string;
  summary: string;
  source: string;
  source_url: string;
  source_type: ClinicalSourceType;
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
const CROSSREF_MAILTO = getEnv('CROSSREF_MAILTO', 'hogolezcano92@gmail.com');
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

const IMAGE_KEY_TO_LOCAL_IMAGE: Record<ClinicalImageKey, string> = {
  neurologia: '/clinical-updates/neurologia.jpg',
  neuro: '/clinical-updates/neuro.jpg',
  ortopedia: '/clinical-updates/ortopedia.jpg',
  geriatria: '/clinical-updates/geriatria.jpg',
  respiratoria: '/clinical-updates/respiratoria.jpg',
  pelvica: '/clinical-updates/pelvica.jpg',
  saude_mulher: '/clinical-updates/saude-da-mulher.jpg',
  saude_homem: '/clinical-updates/saude-do-homem.jpg',
  dermato: '/clinical-updates/dermato.jpg',
  medicina_geral: '/clinical-updates/medicina-geral.jpg',
};

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
  { term: 'fisioterapia dor lombar', category: 'Ortopedia' },
  { term: 'fisioterapia esportiva reabilitação', category: 'Esportiva' },
  { term: 'fisioterapia respiratória reabilitação', category: 'Cardiorrespiratória' },
  { term: 'reabilitação AVC fisioterapia', category: 'Neurológica' },
  { term: 'rehabilitation physical therapy', category: 'Reabilitação' },
  { term: 'physical therapy rehabilitation', category: 'Reabilitação' },
  { term: 'sports physiotherapy rehabilitation', category: 'Esportiva' },
];

const EUROPE_PMC_QUERIES = [
  { term: 'physiotherapy rehabilitation', category: 'Reabilitação' },
  { term: 'physical therapy exercise therapy', category: 'Exercício terapêutico' },
  { term: 'low back pain physiotherapy', category: 'Ortopedia' },
  { term: 'stroke rehabilitation physiotherapy', category: 'Neurológica' },
  { term: 'cardiorespiratory rehabilitation physiotherapy', category: 'Cardiorrespiratória' },
  { term: 'sports physiotherapy rehabilitation', category: 'Esportiva' },
];

const CROSSREF_QUERIES = [
  { term: '"physiotherapy" rehabilitation', category: 'Reabilitação' },
  { term: '"physical therapy" rehabilitation', category: 'Reabilitação' },
  { term: '"exercise therapy" physiotherapy', category: 'Exercício terapêutico' },
  { term: '"low back pain" "physical therapy"', category: 'Ortopedia' },
  { term: '"stroke rehabilitation" physiotherapy', category: 'Neurológica' },
  { term: '"cardiorespiratory rehabilitation" physiotherapy', category: 'Cardiorrespiratória' },
  { term: '"sports physiotherapy" rehabilitation', category: 'Esportiva' },
];

const DEFAULT_IMAGES: Record<string, string> = {
  'Reabilitação': IMAGE_KEY_TO_LOCAL_IMAGE.medicina_geral,
  'Exercício terapêutico': IMAGE_KEY_TO_LOCAL_IMAGE.ortopedia,
  'Ortopedia': IMAGE_KEY_TO_LOCAL_IMAGE.ortopedia,
  'Neurológica': IMAGE_KEY_TO_LOCAL_IMAGE.neurologia,
  'Cardiorrespiratória': IMAGE_KEY_TO_LOCAL_IMAGE.respiratoria,
  'Esportiva': IMAGE_KEY_TO_LOCAL_IMAGE.ortopedia,
  'Geriatria': IMAGE_KEY_TO_LOCAL_IMAGE.geriatria,
  'Fisioterapia': IMAGE_KEY_TO_LOCAL_IMAGE.medicina_geral,
  'Saúde da mulher': IMAGE_KEY_TO_LOCAL_IMAGE.saude_mulher,
  'Saúde do homem': IMAGE_KEY_TO_LOCAL_IMAGE.saude_homem,
  'Saúde pélvica': IMAGE_KEY_TO_LOCAL_IMAGE.pelvica,
  'Dermatofuncional': IMAGE_KEY_TO_LOCAL_IMAGE.dermato,
  'Medicina geral': IMAGE_KEY_TO_LOCAL_IMAGE.medicina_geral,
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

const normalizeText = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const countMatches = (text: string, words: string[]) =>
  words.reduce((score, word) => score + (text.includes(normalizeText(word)) ? 1 : 0), 0);

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalizeIfValid = (date: Date) => {
    if (Number.isNaN(date.getTime())) return null;

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
    'dor lombar', 'cardiorrespiratória', 'idoso', 'neurológica',
  ];
  const blockedTerms = ['weapon', 'gun', 'gambling', 'casino', 'porn', 'suicide'];

  return includeTerms.some((term) => text.includes(term)) && !blockedTerms.some((term) => text.includes(term));
};


const isStrictPhysioScientificTopic = (title: string, summary = '') => {
  const text = normalizeText(`${title} ${summary}`);

  const mustHaveClinicalTerm = [
    'physiotherapy',
    'physical therapy',
    'fisioterapia',
    'exercise therapy',
    'therapeutic exercise',
    'rehabilitation exercise',
    'rehabilitation exercises',
    'musculoskeletal',
    'low back pain',
    'dor lombar',
    'stroke rehabilitation',
    'avc',
    'cardiorespiratory',
    'cardiorrespiratory',
    'pulmonary rehabilitation',
    'reabilitacao pulmonar',
    'sports physiotherapy',
    'sports rehabilitation',
    'neurological rehabilitation',
    'geriatric rehabilitation',
    'physical rehabilitation',
    'clinical rehabilitation',
  ];

  const blockedTerms = [
    'water distribution',
    'distribution systems',
    'engineering',
    'reliability engineering',
    'substance use',
    'addiction',
    'employment',
    'education outcomes',
    'urban rehabilitation',
    'building rehabilitation',
    'infrastructure',
    'regenerative rehabilitation',
    'autism work operators',
    'systems rehabilitation',
    'network rehabilitation',
    'environmental rehabilitation',
    'land rehabilitation',
    'mining rehabilitation',
  ];

  const hasClinicalTerm = mustHaveClinicalTerm.some((term) => text.includes(normalizeText(term)));
  const hasBlockedTerm = blockedTerms.some((term) => text.includes(normalizeText(term)));

  return hasClinicalTerm && !hasBlockedTerm;
};

const looksMostlyEnglish = (value: string) => {
  const text = ` ${normalizeText(value)} `;
  const englishMarkers = [
    ' the ', ' and ', ' of ', ' in ', ' with ', ' for ', ' patients ',
    ' rehabilitation ', ' physical therapy ', ' exercise ', ' effects ',
    ' supplementation ', ' overweight ', ' obese ', ' challenges ',
    ' cardiac ', ' blood flow ', ' beetroot ', ' stroke ',
  ];
  const portugueseMarkers = [
    ' de ', ' da ', ' do ', ' em ', ' com ', ' para ', ' pacientes ',
    ' reabilitacao ', ' fisioterapia ', ' exercicio ', ' efeitos ',
    ' suplementacao ', ' sobrepeso ', ' obesos ', ' desafios ',
    ' cardiaca ', ' fluxo sanguineo ', ' beterraba ', ' avc ',
  ];

  const englishScore = englishMarkers.reduce((score, marker) => score + (text.includes(marker) ? 1 : 0), 0);
  const portugueseScore = portugueseMarkers.reduce((score, marker) => score + (text.includes(marker) ? 1 : 0), 0);

  return englishScore >= 2 && englishScore > portugueseScore;
};

const inferClinicalImageKey = (title: string, summary = '', category = ''): ClinicalImageKey => {
  const text = normalizeText(`${category} ${title} ${summary}`);

  const scores: Record<ClinicalImageKey, number> = {
    neurologia: 0,
    neuro: 0,
    ortopedia: 0,
    geriatria: 0,
    respiratoria: 0,
    pelvica: 0,
    saude_mulher: 0,
    saude_homem: 0,
    dermato: 0,
    medicina_geral: 0,
  };

  scores.neurologia += countMatches(text, [
    'neurologica', 'neurologia', 'avc', 'stroke', 'acidente vascular cerebral',
    'parkinson', 'cerebral', 'neuroplasticidade', 'hemiparesia', 'hemiplegia',
    'marcha', 'equilibrio', 'coordenacao', 'disfagia', 'degluticao', 'vestibular',
  ]);

  scores.neuro += countMatches(text, [
    'neuro', 'controle motor', 'sistema nervoso', 'coordenacao respiratoria',
    'respiracao e degluticao',
  ]);

  scores.ortopedia += countMatches(text, [
    'ortopedia', 'ortopedica', 'musculoesqueletica', 'musculoesqueletico',
    'joelho', 'ombro', 'quadril', 'tornozelo', 'coluna', 'lombar', 'lombalgia',
    'cervical', 'artrose', 'osteoartrite', 'tendinite', 'tendinopatia', 'lca',
    'ligamento', 'fratura', 'dor trocanterica', 'dor', 'lesao',
  ]);

  scores.geriatria += countMatches(text, [
    'geriatria', 'geriatrica', 'idoso', 'idosa', 'idosos', 'envelhecimento',
    'queda', 'quedas', 'fragilidade', 'sarcopenia', 'osteoporose', 'longevidade',
    'autonomia',
  ]);

  scores.respiratoria += countMatches(text, [
    'respiratoria', 'respiratorio', 'cardiorrespiratoria', 'cardiorrespiratorio',
    'cardiaca', 'cardiaco', 'cardiac', 'pulmonar', 'pulmao', 'dpoc', 'asma',
    'ventilacao', 'oxigenio', 'dispneia', 'espirometria', 'respiracao',
    'condicionamento', 'bicicleta', 'ergometrica', 'aerobico',
  ]);

  scores.pelvica += countMatches(text, [
    'pelvica', 'assoalho pelvico', 'incontinencia', 'urinaria', 'uroginecologica',
    'perineo', 'dor pelvica', 'prolapso',
  ]);

  scores.saude_mulher += countMatches(text, [
    'saude da mulher', 'mulher', 'mulheres', 'feminina', 'gestante', 'gestacao',
    'gravidez', 'pos-parto', 'menopausa', 'mama', 'mamaria', 'endometriose',
  ]);

  scores.saude_homem += countMatches(text, [
    'saude do homem', 'homem', 'homens', 'masculina', 'prostata', 'prostatico',
    'urologica', 'erecao',
  ]);

  scores.dermato += countMatches(text, [
    'dermato', 'dermatofuncional', 'pele', 'cicatriz', 'cicatrizacao', 'queimadura',
    'linfedema', 'edema', 'fibrose', 'pos-operatorio', 'estetica', 'drenagem',
  ]);

  scores.medicina_geral += countMatches(text, [
    'medicina geral', 'saude geral', 'clinica', 'prevencao', 'qualidade de vida',
    'estudo', 'pesquisa', 'evidencia', 'tratamento', 'reabilitacao',
  ]);

  if (scores.neurologia > 0 && /avc|stroke|parkinson|neurolog|neuro|disfagia|deglut/.test(text)) {
    scores.neurologia += 4;
  }

  if (scores.pelvica > 0) scores.pelvica += 3;
  if (scores.respiratoria > 0 && /cardio|pulmonar|respirat|dpoc|asma/.test(text)) scores.respiratoria += 3;
  if (scores.ortopedia > 0 && /joelho|ombro|lombar|coluna|quadril|artrose|dor/.test(text)) scores.ortopedia += 2;

  const bestKey = (Object.keys(scores) as ClinicalImageKey[])
    .sort((a, b) => scores[b] - scores[a])[0];

  return bestKey && scores[bestKey] > 0 ? bestKey : 'medicina_geral';
};

const buildImageFields = (title: string, summary: string, category: string, preferredKey?: string | null) => {
  const imageKey = isClinicalImageKey(preferredKey)
    ? String(preferredKey) as ClinicalImageKey
    : inferClinicalImageKey(title, summary, category);

  return {
    image_key: imageKey,
    image_url: IMAGE_KEY_TO_LOCAL_IMAGE[imageKey] || IMAGE_KEY_TO_LOCAL_IMAGE.medicina_geral,
  };
};

const getFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const found = value.find((item) => typeof item === 'string' && item.trim());
      if (found) return String(found).trim();
    }
    if (value && typeof value === 'object') {
      const nested = getFirstString(...Object.values(value as Record<string, unknown>));
      if (nested) return nested;
    }
  }

  return '';
};

const getFirstArrayString = (value: unknown) => {
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === 'string' && item.trim());
    return found ? String(found).trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
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


const fallbackAdaptedItem = (item: ClinicalUpdateInsert): ClinicalUpdateInsert => {
  const fallbackSummary = item.summary
    || `Artigo científico relacionado a ${item.category || 'fisioterapia e reabilitação'}. Abra a fonte para conferir os detalhes.`;

  const title = stripHtml(item.title, 140);
  const summary = stripHtml(fallbackSummary, 340);
  const imageFields = buildImageFields(title || item.title, summary, item.category, item.image_key);

  return {
    ...item,
    title: title || item.title,
    summary,
    ...imageFields,
    is_published: true,
  };
};

const adaptClinicalUpdateToPortuguese = async (item: ClinicalUpdateInsert): Promise<ClinicalUpdateInsert | null> => {
  if (!GROQ_API_KEY) {
    const imageFields = buildImageFields(item.title, item.summary, item.category, item.image_key);
    return { ...item, ...imageFields };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 760,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Você é um editor científico do FisioCareHub para fisioterapeutas brasileiros.',
              'Traduza obrigatoriamente title e summary para português do Brasil, com linguagem profissional, clara e segura.',
              'Nunca devolva o título em inglês. Mesmo títulos científicos devem ser traduzidos para português claro.',
              'Não invente achados, resultados, recomendações clínicas específicas nem dados que não estejam no texto.',
              'Não prometa cura e não transforme o conteúdo em orientação médica individual.',
              'Responda somente JSON válido no formato: {"title":"...","summary":"...","category":"...","image_key":"..."}.',
              'O title deve ter no máximo 110 caracteres.',
              'O summary deve ter no máximo 280 caracteres e explicar por que o tema interessa ao fisioterapeuta.',
              'A category deve ser uma destas: Reabilitação, Exercício terapêutico, Ortopedia, Neurológica, Cardiorrespiratória, Esportiva, Geriatria, Fisioterapia, Saúde da mulher, Saúde do homem, Saúde pélvica, Dermatofuncional, Medicina geral.',
              'A image_key deve ser obrigatoriamente uma destas: neurologia, neuro, ortopedia, geriatria, respiratoria, pelvica, saude_mulher, saude_homem, dermato, medicina_geral.',
              'Escolha image_key pelo tema clínico principal do artigo. Se tiver AVC, disfagia, marcha neurológica, Parkinson ou neuroplasticidade, prefira neurologia/neuro. Se for DPOC, pulmonar, respiração, reabilitação cardíaca ou bicicleta monitorada, use respiratoria. Se for joelho, ombro, lombar, coluna, dor musculoesquelética, dor trocantérica ou artrose, use ortopedia. Se for idoso, quedas, sarcopenia ou fragilidade, use geriatria. Se for assoalho pélvico, incontinência ou dor pélvica, use pelvica. Se for gestação, pós-parto, menopausa, mama ou saúde feminina, use saude_mulher. Se for próstata, urologia masculina ou saúde masculina, use saude_homem. Se for pele, cicatriz, linfedema, queimadura, estética ou pós-operatório tegumentar, use dermato. Se não houver tema claro, use medicina_geral.'
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

    if (!response.ok) return fallbackAdaptedItem(item);

    const data: any = await response.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    const parsed = safeJsonParse(content);
    if (!parsed) return fallbackAdaptedItem(item);

    const title = stripHtml(parsed.title || '', 140);
    const summary = stripHtml(parsed.summary || '', 340);
    const category = stripHtml(parsed.category || item.category, 80);
    const imageKey = isClinicalImageKey(parsed.image_key) ? String(parsed.image_key) : null;

    if (!title || !summary) {
      console.warn('[Clinical Updates Sync] Tradução Groq inválida, usando fallback:', item.external_id);
      return fallbackAdaptedItem(item);
    }

    if (looksMostlyEnglish(`${title} ${summary}`)) {
      console.warn('[Clinical Updates Sync] Groq retornou inglês, usando fallback seguro:', item.external_id);
      return fallbackAdaptedItem(item);
    }

    const imageFields = buildImageFields(title, summary, category, imageKey);

    return {
      ...item,
      title,
      summary,
      category: category || item.category,
      ...imageFields,
    };
  } catch (error) {
    console.warn('[Clinical Updates Sync] Groq indisponível, usando fallback:', error);
    return fallbackAdaptedItem(item);
  }
};

const adaptClinicalUpdatesToPortuguese = async (updates: ClinicalUpdateInsert[]) => {
  if (!GROQ_API_KEY || !updates.length) {
    return updates.map((item) => ({
      ...item,
      ...buildImageFields(item.title, item.summary, item.category, item.image_key),
    }));
  }

  const adapted: ClinicalUpdateInsert[] = [];
  const batchSize = 3;

  for (let index = 0; index < updates.length; index += batchSize) {
    const batch = updates.slice(index, index + batchSize);
    const result = await Promise.all(batch.map((item) => adaptClinicalUpdateToPortuguese(item)));
    adapted.push(...result.filter(Boolean) as ClinicalUpdateInsert[]);
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
    searchUrl.searchParams.set('retmax', '12');
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

      const imageFields = buildImageFields(title, summary, query.category);

      updates.push({
        title,
        summary,
        source,
        source_url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source_type: 'pubmed',
        category: query.category,
        external_id: `pubmed:${id}`,
        published_at: pubDate,
        ...imageFields,
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
    url.searchParams.set('max', '10');
    url.searchParams.set('apikey', GNEWS_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) continue;

    const data: any = await response.json();
    const articles = Array.isArray(data?.articles) ? data.articles : [];

    for (const article of articles) {
      const title = stripHtml(article.title, 240);
      const summary = stripHtml(article.description || article.content || '', 420);
      if (!title || !isSafeClinicalTopic(title, summary)) continue;

      const imageFields = buildImageFields(title, summary || '', query.category);

      updates.push({
        title,
        summary: summary || 'Notícia relacionada à fisioterapia e reabilitação. Abra a fonte para ler o conteúdo completo.',
        source: stripHtml(article.source?.name || 'GNews', 120),
        source_url: String(article.url || '').trim(),
        source_type: 'gnews',
        category: query.category,
        external_id: `gnews:${Buffer.from(String(article.url || title)).toString('base64url').slice(0, 80)}`,
        published_at: normalizeDate(article.publishedAt),
        ...imageFields,
        is_published: true,
        is_featured: false,
      });
    }
  }

  return updates;
};

const fetchEuropePMC = async () => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of EUROPE_PMC_QUERIES) {
    const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
    url.searchParams.set('query', `${query.term} AND FIRST_PDATE:[2024-01-01 TO 2026-12-31]`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageSize', '5');
    url.searchParams.set('sort', 'P_PDATE_D');

    try {
      const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;

      const data: any = await response.json();
      const articles = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];

      for (const article of articles) {
        const title = stripHtml(article.title, 240);
        const abstract = stripHtml(article.abstractText || '', 420);
        const journal = stripHtml(article.journalTitle || article.source || 'Europe PMC', 120);
        const pmid = String(article.pmid || '').trim();
        const doi = String(article.doi || '').trim();

        if (!title || !isSafeClinicalTopic(title, abstract || query.term)) continue;

        const sourceUrl = pmid
          ? `https://europepmc.org/article/MED/${pmid}`
          : doi
            ? `https://doi.org/${doi}`
            : 'https://europepmc.org/';

        const summary = abstract || `${journal}. Artigo biomédico indexado no Europe PMC sobre ${query.term}. Abra a fonte para conferir resumo, autores e detalhes.`;
        const imageFields = buildImageFields(title, summary, query.category);

        updates.push({
          title,
          summary,
          source: journal || 'Europe PMC',
          source_url: sourceUrl,
          source_type: 'europepmc',
          category: query.category,
          external_id: `europepmc:${pmid || doi || Buffer.from(title).toString('base64url').slice(0, 80)}`,
          published_at: normalizeDate(article.firstPublicationDate || article.pubYear),
          ...imageFields,
          is_published: true,
          is_featured: query.category === 'Reabilitação',
        });
      }
    } catch (error) {
      console.warn('[Clinical Updates Sync] Falha ao buscar Europe PMC:', error);
    }
  }

  return updates;
};

const fetchCrossref = async () => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of CROSSREF_QUERIES) {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query', query.term);
    url.searchParams.set('filter', 'type:journal-article,from-pub-date:2024-01-01');
    url.searchParams.set('rows', '5');
    url.searchParams.set('sort', 'published');
    url.searchParams.set('order', 'desc');
    if (CROSSREF_MAILTO) url.searchParams.set('mailto', CROSSREF_MAILTO);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': `FisioCareHub/1.0 (${CROSSREF_MAILTO || 'contact@fisiocarehub.company'})`,
        },
      });

      if (!response.ok) continue;

      const data: any = await response.json();
      const items = Array.isArray(data?.message?.items) ? data.message.items : [];

      for (const item of items) {
        const title = stripHtml(getFirstArrayString(item.title), 240);
        const abstract = stripHtml(item.abstract || item.subtitle?.[0] || '', 420);
        const containerTitle = stripHtml(getFirstArrayString(item['container-title']) || 'Crossref', 120);
        const doi = String(item.DOI || '').trim();

        if (!title || !isSafeClinicalTopic(title, abstract || query.term)) continue;
        if (!isStrictPhysioScientificTopic(title, `${abstract} ${query.term} ${containerTitle}`)) continue;

        const publishedParts = item.published?.['date-parts']?.[0] || item['published-print']?.['date-parts']?.[0] || item['published-online']?.['date-parts']?.[0];
        const publishedAt = Array.isArray(publishedParts) && publishedParts.length
          ? normalizeDate(`${publishedParts[0]}-${String(publishedParts[1] || 1).padStart(2, '0')}-${String(publishedParts[2] || 1).padStart(2, '0')}`)
          : null;

        const sourceUrl = doi ? `https://doi.org/${doi}` : String(item.URL || 'https://search.crossref.org/').trim();
        const summary = abstract || `${containerTitle}. Metadado científico encontrado no Crossref sobre ${query.term}. Abra a fonte para conferir o artigo completo.`;
        const imageFields = buildImageFields(title, summary, query.category);

        updates.push({
          title,
          summary,
          source: containerTitle || 'Crossref',
          source_url: sourceUrl,
          source_type: 'crossref',
          category: query.category,
          external_id: `crossref:${doi || Buffer.from(sourceUrl || title).toString('base64url').slice(0, 80)}`,
          published_at: publishedAt,
          ...imageFields,
          is_published: true,
          is_featured: false,
        });
      }
    } catch (error) {
      console.warn('[Clinical Updates Sync] Falha ao buscar Crossref:', error);
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
    const [pubMedUpdates, newsUpdates, europePmcUpdates, crossrefUpdates] = await Promise.all([
      fetchPubMed(),
      fetchGNews(),
      fetchEuropePMC(),
      fetchCrossref(),
    ]);

    const uniqueMap = new Map<string, ClinicalUpdateInsert>();
    [
      ...newsUpdates.slice(0, 10),
      ...pubMedUpdates.slice(0, 24),
      ...europePmcUpdates.slice(0, 4),
      ...crossrefUpdates.slice(0, 4),
    ].forEach((item) => {
      if (item.external_id && item.title) uniqueMap.set(item.external_id, item);
    });

    const updates = Array.from(uniqueMap.values()).slice(0, 42);

    if (!updates.length) {
      return res.status(200).json({ success: true, inserted: 0, message: 'Nenhum conteúdo novo encontrado.' });
    }

    const adaptedUpdates = await adaptClinicalUpdatesToPortuguese(updates);

    if (!adaptedUpdates.length) {
      return res.status(200).json({
        success: true,
        inserted: 0,
        translated_with_groq: Boolean(GROQ_API_KEY),
        skipped_untranslated: updates.length,
        message: 'Conteúdos encontrados, mas nenhum passou no filtro de tradução para português.',
      });
    }

    const { data, error } = await supabase
      .from('clinical_updates')
      .upsert(adaptedUpdates, { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id, external_id');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      inserted: data?.length || 0,
      translated_with_groq: Boolean(GROQ_API_KEY),
      skipped_untranslated: updates.length - adaptedUpdates.length,
      sources: {
        pubmed: pubMedUpdates.length,
        gnews: newsUpdates.length,
        europepmc: europePmcUpdates.length,
        crossref: crossrefUpdates.length,
      },
      selected_for_save: {
        pubmed: Math.min(pubMedUpdates.length, 24),
        gnews: Math.min(newsUpdates.length, 10),
        europepmc: Math.min(europePmcUpdates.length, 4),
        crossref: Math.min(crossrefUpdates.length, 4),
        total: updates.length,
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
