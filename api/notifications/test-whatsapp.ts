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
  translation_status?: 'groq' | 'deepl' | 'fallback';
};

type ClinicalUpdateBackfillRow = ClinicalUpdateInsert & {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
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
const DEEPL_API_KEY = getEnv('DEEPL_API_KEY');
const DEEPL_API_URL = getEnv('DEEPL_API_URL');

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
  { term: 'physiotherapy rehabilitation', category: 'Fisioterapia' },
  { term: 'physical therapy exercise therapy', category: 'Fisioterapia' },
  { term: 'therapeutic exercise rehabilitation', category: 'Exercício terapêutico' },
  { term: 'musculoskeletal rehabilitation', category: 'Ortopedia' },
  { term: 'low back pain rehabilitation', category: 'Ortopedia' },
  { term: 'knee osteoarthritis exercise therapy', category: 'Ortopedia' },
  { term: 'shoulder pain rehabilitation', category: 'Ortopedia' },
  { term: 'sports injury rehabilitation', category: 'Esportiva' },
  { term: 'stroke rehabilitation', category: 'Neurologia' },
  { term: 'Parkinson disease rehabilitation', category: 'Neurologia' },
  { term: 'neurorehabilitation exercise', category: 'Neurologia' },
  { term: 'cardiac rehabilitation exercise', category: 'Cardiologia' },
  { term: 'pulmonary rehabilitation COPD', category: 'Cardiorrespiratória' },
  { term: 'intensive care early mobilization', category: 'UTI e cuidados críticos' },
  { term: 'ICU acquired weakness rehabilitation', category: 'UTI e cuidados críticos' },
  { term: 'geriatrics frailty falls prevention', category: 'Geriatria' },
  { term: 'sarcopenia resistance training older adults', category: 'Geriatria' },
  { term: 'chronic pain exercise therapy', category: 'Dor' },
  { term: 'pelvic floor rehabilitation urinary incontinence', category: 'Saúde pélvica' },
  { term: 'women health postpartum exercise', category: 'Saúde da mulher' },
  { term: 'men health prostate cancer rehabilitation', category: 'Saúde do homem' },
  { term: 'pediatric rehabilitation cerebral palsy', category: 'Pediatria' },
  { term: 'mental health physical activity depression anxiety', category: 'Saúde mental' },
  { term: 'diabetes exercise lifestyle intervention', category: 'Diabetes e metabolismo' },
  { term: 'obesity exercise nutrition intervention', category: 'Nutrição e metabolismo' },
  { term: 'hypertension exercise intervention', category: 'Cardiologia' },
  { term: 'primary care prevention physical activity', category: 'Medicina geral' },
  { term: 'public health physical activity prevention', category: 'Saúde pública' },
  { term: 'digital health telehealth rehabilitation', category: 'Tecnologia em saúde' },
  { term: 'artificial intelligence healthcare rehabilitation', category: 'Tecnologia em saúde' },
];

const GNEWS_QUERIES = [
  { term: 'fisioterapia reabilitação evidências', category: 'Fisioterapia' },
  { term: 'saúde reabilitação exercícios', category: 'Fisioterapia' },
  { term: 'dor lombar tratamento exercício saúde', category: 'Dor' },
  { term: 'artrose joelho exercício saúde', category: 'Ortopedia' },
  { term: 'lesão esportiva reabilitação saúde', category: 'Esportiva' },
  { term: 'AVC reabilitação saúde', category: 'Neurologia' },
  { term: 'Parkinson exercício reabilitação', category: 'Neurologia' },
  { term: 'reabilitação cardíaca exercício', category: 'Cardiologia' },
  { term: 'reabilitação pulmonar DPOC', category: 'Cardiorrespiratória' },
  { term: 'UTI mobilização precoce saúde', category: 'UTI e cuidados críticos' },
  { term: 'idosos quedas prevenção saúde', category: 'Geriatria' },
  { term: 'sarcopenia idosos exercício', category: 'Geriatria' },
  { term: 'assoalho pélvico incontinência saúde', category: 'Saúde pélvica' },
  { term: 'saúde da mulher pós-parto exercício', category: 'Saúde da mulher' },
  { term: 'saúde do homem reabilitação próstata', category: 'Saúde do homem' },
  { term: 'pediatria reabilitação desenvolvimento infantil', category: 'Pediatria' },
  { term: 'saúde mental atividade física ansiedade depressão', category: 'Saúde mental' },
  { term: 'diabetes exercício saúde', category: 'Diabetes e metabolismo' },
  { term: 'obesidade nutrição exercício saúde', category: 'Nutrição e metabolismo' },
  { term: 'telemedicina telessaúde saúde digital', category: 'Tecnologia em saúde' },
];

const EUROPE_PMC_QUERIES = [
  { term: 'physiotherapy rehabilitation', category: 'Fisioterapia' },
  { term: 'exercise therapy rehabilitation', category: 'Exercício terapêutico' },
  { term: 'low back pain rehabilitation', category: 'Ortopedia' },
  { term: 'osteoarthritis exercise therapy', category: 'Ortopedia' },
  { term: 'stroke rehabilitation', category: 'Neurologia' },
  { term: 'Parkinson rehabilitation exercise', category: 'Neurologia' },
  { term: 'cardiac rehabilitation exercise', category: 'Cardiologia' },
  { term: 'pulmonary rehabilitation COPD', category: 'Cardiorrespiratória' },
  { term: 'intensive care early mobilization', category: 'UTI e cuidados críticos' },
  { term: 'frailty falls prevention older adults', category: 'Geriatria' },
  { term: 'chronic pain exercise therapy', category: 'Dor' },
  { term: 'pelvic floor urinary incontinence rehabilitation', category: 'Saúde pélvica' },
  { term: 'postpartum exercise women health', category: 'Saúde da mulher' },
  { term: 'pediatric rehabilitation cerebral palsy', category: 'Pediatria' },
  { term: 'physical activity mental health depression anxiety', category: 'Saúde mental' },
  { term: 'diabetes exercise lifestyle intervention', category: 'Diabetes e metabolismo' },
  { term: 'nutrition obesity exercise intervention', category: 'Nutrição e metabolismo' },
  { term: 'telehealth digital health rehabilitation', category: 'Tecnologia em saúde' },
];

const CROSSREF_QUERIES = [
  { term: '"physiotherapy" rehabilitation', category: 'Fisioterapia' },
  { term: '"physical therapy" rehabilitation', category: 'Fisioterapia' },
  { term: '"exercise therapy" rehabilitation', category: 'Exercício terapêutico' },
  { term: '"low back pain" rehabilitation exercise', category: 'Ortopedia' },
  { term: '"osteoarthritis" "exercise therapy"', category: 'Ortopedia' },
  { term: '"stroke rehabilitation" exercise', category: 'Neurologia' },
  { term: '"Parkinson" rehabilitation exercise', category: 'Neurologia' },
  { term: '"cardiac rehabilitation" exercise', category: 'Cardiologia' },
  { term: '"pulmonary rehabilitation" COPD', category: 'Cardiorrespiratória' },
  { term: '"early mobilization" "intensive care"', category: 'UTI e cuidados críticos' },
  { term: '"falls prevention" "older adults"', category: 'Geriatria' },
  { term: '"chronic pain" "exercise therapy"', category: 'Dor' },
  { term: '"pelvic floor" rehabilitation', category: 'Saúde pélvica' },
  { term: '"postpartum" exercise "women health"', category: 'Saúde da mulher' },
  { term: '"pediatric rehabilitation"', category: 'Pediatria' },
  { term: '"physical activity" "mental health"', category: 'Saúde mental' },
  { term: '"diabetes" exercise intervention', category: 'Diabetes e metabolismo' },
  { term: '"obesity" nutrition exercise intervention', category: 'Nutrição e metabolismo' },
  { term: '"digital health" telehealth healthcare', category: 'Tecnologia em saúde' },
];

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
    // Fisioterapia, reabilitação e movimento
    'physiotherapy', 'physical therapy', 'rehabilitation', 'exercise therapy',
    'therapeutic exercise', 'musculoskeletal', 'sports injury', 'sports medicine',
    'fisioterapia', 'reabilitação', 'reabilitacao', 'exercício terapêutico', 'exercicio terapeutico',

    // Ortopedia, neuro, cardio, respiração, UTI e dor
    'orthopedics', 'osteoarthritis', 'arthritis', 'low back pain', 'neck pain', 'chronic pain',
    'neurology', 'stroke', 'parkinson', 'alzheimer', 'neurorehabilitation',
    'cardiology', 'cardiac rehabilitation', 'heart failure', 'hypertension',
    'pulmonary', 'copd', 'asthma', 'cardiorespiratory', 'respiratory',
    'intensive care', 'critical care', 'early mobilization', 'ICU acquired weakness',
    'ortopedia', 'artrose', 'artrite', 'dor lombar', 'dor cervical', 'dor crônica', 'dor cronica',
    'neurologia', 'avc', 'cardiologia', 'hipertensão', 'hipertensao',
    'cardiorrespiratória', 'cardiorrespiratoria', 'respiratória', 'respiratoria', 'uti',

    // Saúde geral
    'medicine', 'clinical medicine', 'primary care', 'internal medicine', 'public health',
    'preventive medicine', 'health promotion', 'digital health', 'telehealth',
    'artificial intelligence health', 'wearable devices',
    'medicina', 'clínica médica', 'clinica medica', 'atenção primária', 'atencao primaria',
    'saúde pública', 'saude publica', 'prevenção', 'prevencao', 'saúde digital', 'saude digital',

    // Grupos e condições clínicas
    'geriatrics', 'elderly', 'older adults', 'frailty', 'falls prevention', 'sarcopenia',
    'pediatrics', 'child health', 'cerebral palsy', 'autism',
    'women health', 'pregnancy', 'postpartum', 'pelvic floor', 'urinary incontinence',
    'men health', 'prostate cancer rehabilitation',
    'mental health', 'depression', 'anxiety',
    'nutrition', 'obesity', 'diabetes', 'metabolic syndrome',
    'geriatria', 'idoso', 'idosa', 'idosos', 'fragilidade', 'quedas', 'sarcopenia',
    'pediatria', 'saúde da criança', 'saude da crianca', 'paralisia cerebral', 'autismo',
    'saúde da mulher', 'saude da mulher', 'gestação', 'gestacao', 'pós-parto', 'pos-parto',
    'assoalho pélvico', 'assoalho pelvico', 'incontinência', 'incontinencia',
    'saúde do homem', 'saude do homem', 'próstata', 'prostata',
    'saúde mental', 'saude mental', 'depressão', 'depressao', 'ansiedade',
    'nutrição', 'nutricao', 'obesidade', 'diabetes', 'síndrome metabólica', 'sindrome metabolica',
  ];
  const blockedTerms = ['weapon', 'gun', 'gambling', 'casino', 'porn', 'suicide'];

  return includeTerms.some((term) => text.includes(term)) && !blockedTerms.some((term) => text.includes(term));
};

const isStrictPhysioScientificTopic = (title: string, summary = '') => {
  const text = normalizeText(`${title} ${summary}`);

  const mustHaveClinicalTerm = [
    'physiotherapy', 'physical therapy', 'fisioterapia', 'exercise therapy',
    'therapeutic exercise', 'rehabilitation exercise', 'rehabilitation exercises',
    'musculoskeletal', 'low back pain', 'dor lombar', 'stroke rehabilitation', 'avc',
    'cardiorespiratory', 'cardiorrespiratory', 'pulmonary rehabilitation',
    'sports physiotherapy', 'sports rehabilitation', 'neurological rehabilitation',
    'geriatric rehabilitation', 'physical rehabilitation', 'clinical rehabilitation',

    // Saúde geral confiável para Crossref sem fugir do foco clínico
    'orthopedics', 'osteoarthritis', 'arthritis', 'sports medicine', 'chronic pain',
    'neurology', 'stroke', 'parkinson', 'alzheimer', 'neurorehabilitation',
    'cardiology', 'cardiac rehabilitation', 'heart failure', 'hypertension',
    'pulmonary', 'copd', 'asthma', 'respiratory rehabilitation',
    'intensive care', 'critical care', 'early mobilization', 'ICU acquired weakness',
    'geriatrics', 'elderly', 'older adults', 'frailty', 'falls prevention', 'sarcopenia',
    'pediatrics', 'child health', 'cerebral palsy',
    'women health', 'pregnancy', 'postpartum', 'pelvic floor', 'urinary incontinence',
    'men health', 'prostate cancer rehabilitation',
    'mental health', 'depression', 'anxiety', 'physical activity',
    'nutrition', 'obesity', 'diabetes', 'metabolic syndrome',
    'primary care', 'public health', 'preventive medicine', 'digital health', 'telehealth',
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

  const title = looksMostlyEnglish(String(item.title || ''))
    ? stripHtml(`Artigo recente sobre ${item.category || 'fisioterapia e reabilitação'}`, 140)
    : stripHtml(item.title, 140);
  const summary = stripHtml(fallbackSummary, 340);
  const imageFields = buildImageFields(title || item.title, summary, item.category, item.image_key);

  return {
    ...item,
    title: title || item.title,
    summary,
    ...imageFields,
    is_published: true,
    translation_status: 'fallback',
  };
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestGroqTranslation = async (item: ClinicalUpdateInsert, attempt: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: attempt === 1 ? 0.1 : 0,
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

    if (!response.ok) {
      throw new Error(`Groq HTTP ${response.status}`);
    }

    const data: any = await response.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    const parsed = safeJsonParse(content);

    if (!parsed) {
      throw new Error('Groq returned invalid JSON');
    }

    const title = stripHtml(parsed.title || '', 140);
    const summary = stripHtml(parsed.summary || '', 340);
    const category = stripHtml(parsed.category || item.category, 80);
    const imageKey = isClinicalImageKey(parsed.image_key) ? String(parsed.image_key) : null;

    if (!title || !summary) {
      throw new Error('Groq returned empty title or summary');
    }

    if (looksMostlyEnglish(`${title} ${summary}`)) {
      throw new Error('Groq returned mostly English content');
    }

    const imageFields = buildImageFields(title, summary, category, imageKey);

    return {
      ...item,
      title,
      summary,
      category: category || item.category,
      ...imageFields,
      translation_status: 'groq' as const,
    };
  } finally {
    clearTimeout(timeout);
  }
};


const buildClinicalEditorSystemPrompt = () => [
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
].join(' ');

const buildClinicalEditorPayload = (item: ClinicalUpdateInsert) => ({
  title: item.title,
  summary: item.summary,
  category: item.category,
  source_type: item.source_type,
  source: item.source,
});

const normalizeTranslatedClinicalItem = (
  item: ClinicalUpdateInsert,
  parsed: any,
  provider: 'groq' | 'deepl'
): ClinicalUpdateInsert => {
  const title = stripHtml(parsed?.title || '', 140);
  const summary = stripHtml(parsed?.summary || '', 340);
  const category = stripHtml(parsed?.category || item.category, 80);
  const imageKey = isClinicalImageKey(parsed?.image_key) ? String(parsed.image_key) : null;

  if (!title || !summary) {
    throw new Error(`${provider} returned empty title or summary`);
  }

  if (looksMostlyEnglish(`${title} ${summary}`)) {
    throw new Error(`${provider} returned mostly English content`);
  }

  const imageFields = buildImageFields(title, summary, category, imageKey);

  return {
    ...item,
    title,
    summary,
    category: category || item.category,
    ...imageFields,
    translation_status: provider,
  };
};


const getDeepLBaseUrl = () => {
  if (DEEPL_API_URL) return DEEPL_API_URL.replace(/\/+$/, '');
  return DEEPL_API_KEY.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
};

const requestDeepLTranslation = async (item: ClinicalUpdateInsert) => {
  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const fallbackSummary = item.summary
      || `Artigo científico relacionado a ${item.category || 'fisioterapia e reabilitação'}. Abra a fonte para conferir os detalhes.`;

    const response = await fetch(`${getDeepLBaseUrl()}/v2/translate`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [
          stripHtml(item.title, 240),
          stripHtml(fallbackSummary, 420),
        ],
        target_lang: 'PT-BR',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`DeepL HTTP ${response.status}: ${errorText.slice(0, 400)}`);
    }

    const data: any = await response.json();
    const translations = Array.isArray(data?.translations) ? data.translations : [];

    const title = stripHtml(translations?.[0]?.text || '', 140);
    const summary = stripHtml(translations?.[1]?.text || '', 340);

    if (!title || !summary) {
      throw new Error('DeepL returned empty title or summary');
    }

    const imageFields = buildImageFields(title, summary, item.category, item.image_key);

    return {
      ...item,
      title,
      summary,
      ...imageFields,
      translation_status: 'deepl' as const,
    };
  } finally {
    clearTimeout(timeout);
  }
};


const adaptClinicalUpdateToPortuguese = async (item: ClinicalUpdateInsert): Promise<ClinicalUpdateInsert | null> => {
  const groqAttempts = GROQ_API_KEY ? 2 : 0;
  const deeplAttempts = DEEPL_API_KEY ? 1 : 0;

  for (let attempt = 1; attempt <= groqAttempts; attempt += 1) {
    try {
      const result = await requestGroqTranslation(item, attempt);
      return {
        ...result,
        translation_status: 'groq',
      };
    } catch (error) {
      console.warn(`[Clinical Updates Sync] Groq falhou na tentativa ${attempt}/${groqAttempts}:`, error);

      if (attempt < groqAttempts) {
        await wait(700 * attempt);
      }
    }
  }

  for (let attempt = 1; attempt <= deeplAttempts; attempt += 1) {
    try {
      return await requestDeepLTranslation(item);
    } catch (error) {
      console.warn(`[Clinical Updates Sync] DeepL falhou na tentativa ${attempt}/${deeplAttempts}:`, error);

      if (attempt < deeplAttempts) {
        await wait(900 * attempt);
      }
    }
  }

  console.warn('[Clinical Updates Sync] Groq/DeepL falharam, publicando com fallback:', item.external_id);
  return fallbackAdaptedItem(item);
};

const adaptClinicalUpdatesToPortuguese = async (updates: ClinicalUpdateInsert[]) => {
  if (!updates.length) return [];

  const adapted: ClinicalUpdateInsert[] = [];
  const batchSize = 1;

  for (let index = 0; index < updates.length; index += batchSize) {
    const batch = updates.slice(index, index + batchSize);
    const result = await Promise.all(batch.map((item) => adaptClinicalUpdateToPortuguese(item)));
    adapted.push(...result.filter(Boolean) as ClinicalUpdateInsert[]);
  }

  return adapted;
};


const clinicalRowToInsert = (row: ClinicalUpdateBackfillRow): ClinicalUpdateInsert => ({
  title: row.title,
  summary: row.summary || '',
  source: row.source || 'FisioCareHub',
  source_url: row.source_url || '',
  source_type: row.source_type,
  category: row.category || 'Fisioterapia',
  external_id: row.external_id,
  published_at: row.published_at || null,
  image_url: row.image_url || null,
  image_key: row.image_key || null,
  is_published: Boolean(row.is_published),
  is_featured: Boolean(row.is_featured),
});

const backfillTranslateClinicalUpdates = async (req: VercelRequest, res: VercelResponse) => {
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Supabase não configurado. Verifique SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  const fullMode = req.query.full === '1';
  const limit = fullMode ? 50 : 20;

  const { data: rows, error } = await supabase
    .from('clinical_updates')
    .select('id, title, summary, source, source_url, source_type, category, external_id, published_at, image_url, image_key, is_published, is_featured, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const candidates = ((rows || []) as ClinicalUpdateBackfillRow[])
    .filter((item) => looksMostlyEnglish(`${item.title || ''} ${item.summary || ''}`));

  if (!candidates.length) {
    return res.status(200).json({
      success: true,
      mode: fullMode ? 'backfill_full' : 'backfill_light',
      checked: rows?.length || 0,
      candidates: 0,
      updated: 0,
      message: 'Nenhum artigo em inglês encontrado dentro do limite analisado.',
    });
  }

  const translatedRows: ClinicalUpdateBackfillRow[] = [];

  for (const row of candidates) {
    const translated = await adaptClinicalUpdateToPortuguese(clinicalRowToInsert(row));

    if (!translated) continue;

    translatedRows.push({
      ...row,
      ...translated,
      id: row.id,
    });
  }

  if (!translatedRows.length) {
    return res.status(200).json({
      success: true,
      mode: fullMode ? 'backfill_full' : 'backfill_light',
      checked: rows?.length || 0,
      candidates: candidates.length,
      updated: 0,
      translated_with_groq: Boolean(GROQ_API_KEY),
      translated_with_deepl: Boolean(DEEPL_API_KEY),
      message: 'Artigos candidatos encontrados, mas nenhum conseguiu ser traduzido.',
    });
  }

  const updatesForSupabase = translatedRows.map(({ id, translation_status, created_at, updated_at, ...item }) => ({
    id,
    ...item,
  }));

  const { data: updatedData, error: updateError } = await supabase
    .from('clinical_updates')
    .upsert(updatesForSupabase, { onConflict: 'id', ignoreDuplicates: false })
    .select('id, external_id');

  if (updateError) throw updateError;

  const groqCount = translatedRows.filter((item) => item.translation_status === 'groq').length;
  const deeplCount = translatedRows.filter((item) => item.translation_status === 'deepl').length;
  const fallbackCount = translatedRows.filter((item) => item.translation_status === 'fallback').length;

  return res.status(200).json({
    success: true,
    mode: fullMode ? 'backfill_full' : 'backfill_light',
    checked: rows?.length || 0,
    candidates: candidates.length,
    updated: updatedData?.length || 0,
    translated_with_groq: Boolean(GROQ_API_KEY),
    translated_with_deepl: Boolean(DEEPL_API_KEY),
    translated_by_groq: groqCount,
    translated_by_deepl: deeplCount,
    translated_count: groqCount + deeplCount,
    fallback_count: fallbackCount,
  });
};


const fetchPubMed = async (maxQueries = PUBMED_QUERIES.length) => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of PUBMED_QUERIES.slice(0, maxQueries)) {
    const searchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    searchUrl.searchParams.set('db', 'pubmed');
    searchUrl.searchParams.set('term', `${query.term} AND (2024:2026[pdat])`);
    searchUrl.searchParams.set('retmode', 'json');
    searchUrl.searchParams.set('retmax', '8');
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

const fetchGNews = async (maxQueries = GNEWS_QUERIES.length) => {
  if (!GNEWS_API_KEY) return [] as ClinicalUpdateInsert[];

  const updates: ClinicalUpdateInsert[] = [];

  for (const query of GNEWS_QUERIES.slice(0, maxQueries)) {
    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.set('q', query.term);
    url.searchParams.set('lang', query.term.includes('fisioterapia') ? 'pt' : 'en');
    url.searchParams.set('country', query.term.includes('fisioterapia') ? 'br' : 'us');
    url.searchParams.set('max', '6');
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

const fetchEuropePMC = async (maxQueries = EUROPE_PMC_QUERIES.length) => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of EUROPE_PMC_QUERIES.slice(0, maxQueries)) {
    const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
    url.searchParams.set('query', `${query.term} AND FIRST_PDATE:[2024-01-01 TO 2026-12-31]`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageSize', '8');
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

const fetchCrossref = async (maxQueries = CROSSREF_QUERIES.length) => {
  const updates: ClinicalUpdateInsert[] = [];

  for (const query of CROSSREF_QUERIES.slice(0, maxQueries)) {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query', query.term);
    url.searchParams.set('filter', 'type:journal-article,from-pub-date:2024-01-01');
    url.searchParams.set('rows', '6');
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
    if (req.query.backfill === '1') {
      return backfillTranslateClinicalUpdates(req, res);
    }

    // Modo padrão leve para evitar timeout na Vercel.
    // Use ?full=1 apenas quando quiser uma rodada maior.
    const fullMode = req.query.full === '1';

    const limits = fullMode
      ? {
          pubmedQueries: PUBMED_QUERIES.length,
          gnewsQueries: GNEWS_QUERIES.length,
          europePmcQueries: EUROPE_PMC_QUERIES.length,
          crossrefQueries: CROSSREF_QUERIES.length,

          // Rodada grande manual: até 100 conteúdos, bem distribuídos entre fontes.
          pubmedSelect: 45,
          europePmcSelect: 25,
          crossrefSelect: 15,
          newsSelect: 15,
          total: 100,
        }
      : {
          // Modo leve do cron: mais amplo que antes, mas ainda seguro para timeout.
          pubmedQueries: 8,
          gnewsQueries: 4,
          europePmcQueries: 4,
          crossrefQueries: 3,
          pubmedSelect: 12,
          europePmcSelect: 5,
          crossrefSelect: 2,
          newsSelect: 4,
          total: 23,
        };

    const [pubMedUpdates, newsUpdates, europePmcUpdates, crossrefUpdates] = await Promise.all([
      fetchPubMed(limits.pubmedQueries),
      fetchGNews(limits.gnewsQueries),
      limits.europePmcQueries > 0 ? fetchEuropePMC(limits.europePmcQueries) : Promise.resolve([] as ClinicalUpdateInsert[]),
      limits.crossrefQueries > 0 ? fetchCrossref(limits.crossrefQueries) : Promise.resolve([] as ClinicalUpdateInsert[]),
    ]);

    const uniqueMap = new Map<string, ClinicalUpdateInsert>();
    [
      ...newsUpdates.slice(0, limits.newsSelect),
      ...pubMedUpdates.slice(0, limits.pubmedSelect),
      ...europePmcUpdates.slice(0, limits.europePmcSelect),
      ...crossrefUpdates.slice(0, limits.crossrefSelect),
    ].forEach((item) => {
      if (item.external_id && item.title) uniqueMap.set(item.external_id, item);
    });

    const updates = Array.from(uniqueMap.values()).slice(0, limits.total);

    if (!updates.length) {
      return res.status(200).json({ success: true, inserted: 0, message: 'Nenhum conteúdo novo encontrado.' });
    }

    const adaptedUpdates = await adaptClinicalUpdatesToPortuguese(updates);

    if (!adaptedUpdates.length) {
      return res.status(200).json({
        success: true,
        inserted: 0,
        translated_with_groq: Boolean(GROQ_API_KEY),
        translated_with_deepl: Boolean(DEEPL_API_KEY),
        skipped_untranslated: updates.length,
        message: 'Conteúdos encontrados, mas nenhum passou no filtro de tradução para português.',
      });
    }

    const { data, error } = await supabase
      .from('clinical_updates')
      .upsert(adaptedUpdates.map(({ translation_status, ...item }) => item), { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id, external_id');

    if (error) throw error;

    const groqCount = adaptedUpdates.filter((item) => item.translation_status === 'groq').length;
    const deeplCount = adaptedUpdates.filter((item) => item.translation_status === 'deepl').length;
    const translatedCount = groqCount + deeplCount;
    const fallbackCount = adaptedUpdates.filter((item) => item.translation_status === 'fallback').length;

    return res.status(200).json({
      success: true,
      inserted: data?.length || 0,
      translated_with_groq: Boolean(GROQ_API_KEY),
      translated_with_deepl: Boolean(DEEPL_API_KEY),
      translated_by_groq: groqCount,
      translated_by_deepl: deeplCount,
      translated_count: translatedCount,
      fallback_count: fallbackCount,
      skipped_untranslated: updates.length - adaptedUpdates.length,
      sources: {
        pubmed: pubMedUpdates.length,
        gnews: newsUpdates.length,
        europepmc: europePmcUpdates.length,
        crossref: crossrefUpdates.length,
      },
      mode: fullMode ? 'full' : 'light',
      selected_for_save: {
        pubmed: Math.min(pubMedUpdates.length, limits.pubmedSelect),
        gnews: Math.min(newsUpdates.length, limits.newsSelect),
        europepmc: Math.min(europePmcUpdates.length, limits.europePmcSelect),
        crossref: Math.min(crossrefUpdates.length, limits.crossrefSelect),
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
