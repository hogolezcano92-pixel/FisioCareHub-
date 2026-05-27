export type ClinicalImageInput = {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  sourceType?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export type ClinicalImageMatch = {
  key: string;
  label: string;
  src: string;
};

const LOCAL_IMAGES: Record<string, ClinicalImageMatch> = {
  neurologia: {
    key: 'neurologia',
    label: 'Neurologia',
    src: '/clinical-updates/neurologia.jpg',
  },
  neuro: {
    key: 'neuro',
    label: 'Neurologia',
    src: '/clinical-updates/neuro.jpg',
  },
  ortopedia: {
    key: 'ortopedia',
    label: 'Ortopedia',
    src: '/clinical-updates/ortopedia.jpg',
  },
  geriatria: {
    key: 'geriatria',
    label: 'Geriatria',
    src: '/clinical-updates/geriatria.jpg',
  },
  respiratoria: {
    key: 'respiratoria',
    label: 'Cardiorrespiratória',
    src: '/clinical-updates/respiratoria.jpg',
  },
  pelvica: {
    key: 'pelvica',
    label: 'Saúde pélvica',
    src: '/clinical-updates/pelvica.jpg',
  },
  saude_mulher: {
    key: 'saude_mulher',
    label: 'Saúde da mulher',
    src: '/clinical-updates/saude-da-mulher.jpg',
  },
  saude_homem: {
    key: 'saude_homem',
    label: 'Saúde do homem',
    src: '/clinical-updates/saude-do-homem.jpg',
  },
  dermato: {
    key: 'dermato',
    label: 'Dermatofuncional',
    src: '/clinical-updates/dermato.jpg',
  },
  medicina_geral: {
    key: 'medicina_geral',
    label: 'Medicina geral',
    src: '/clinical-updates/medicina-geral.jpg',
  },
};

const FALLBACK_IMAGE = LOCAL_IMAGES.medicina_geral;

const normalizeText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const countMatches = (text: string, words: string[]) =>
  words.reduce((score, word) => score + (text.includes(normalizeText(word)) ? 1 : 0), 0);

const normalizeImageKey = (value?: string | null) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const hasAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(normalizeText(word)));

const clearTopicOverride = (text: string): keyof typeof LOCAL_IMAGES | null => {
  const hasRespiratory = hasAny(text, [
    'cardiorrespiratoria',
    'cardiorrespiratorio',
    'respiratoria',
    'respiratorio',
    'respiracao',
    'pulmonar',
    'pulmao',
    'pulmoes',
    'dpoc',
    'asma',
    'ventilacao',
    'oxigenio',
    'dispneia',
    'espirometria',
    'cardiaca',
    'cardiaco',
    'cardiopulmonar',
    'reabilitacao cardiaca',
    'condicionamento cardiorrespiratorio',
    'exercicio aerobico',
    'bicicleta ergometrica',
  ]);

  const hasNeuro = hasAny(text, [
    'neurologia',
    'neurologica',
    'neuro',
    'avc',
    'stroke',
    'acidente vascular cerebral',
    'parkinson',
    'hemiparesia',
    'hemiplegia',
    'neuroplasticidade',
    'disfagia',
    'degluticao',
    'vestibular',
    'controle motor',
  ]);

  const hasOrtho = hasAny(text, [
    'ortopedia',
    'ortopedica',
    'musculoesqueletica',
    'musculoesqueletico',
    'joelho',
    'ombro',
    'quadril',
    'tornozelo',
    'coluna',
    'lombar',
    'lombalgia',
    'cervical',
    'artrose',
    'osteoartrite',
    'tendinite',
    'tendinopatia',
    'lca',
    'ligamento',
    'fratura',
    'dor trocanterica',
  ]);

  const hasGeriatric = hasAny(text, [
    'geriatria',
    'geriatrica',
    'idoso',
    'idosa',
    'idosos',
    'envelhecimento',
    'queda',
    'quedas',
    'fragilidade',
    'sarcopenia',
    'osteoporose',
    'longevidade',
  ]);

  const hasPelvic = hasAny(text, [
    'pelvica',
    'assoalho pelvico',
    'incontinencia',
    'urinaria',
    'uroginecologica',
    'perineo',
    'dor pelvica',
    'prolapso',
  ]);

  const hasWomanHealth = hasAny(text, [
    'saude da mulher',
    'mulher',
    'mulheres',
    'feminina',
    'gestante',
    'gestacao',
    'gravidez',
    'pos-parto',
    'menopausa',
    'mama',
    'mamaria',
    'endometriose',
  ]);

  const hasManHealth = hasAny(text, [
    'saude do homem',
    'homem',
    'homens',
    'masculina',
    'prostata',
    'prostatico',
    'urologica',
    'erecao',
  ]);

  const hasDermato = hasAny(text, [
    'dermato',
    'dermatofuncional',
    'pele',
    'cicatriz',
    'cicatrizacao',
    'queimadura',
    'linfedema',
    'edema',
    'fibrose',
    'pos-operatorio',
    'estetica',
    'drenagem',
  ]);

  // Prioridade forte: quando o texto é claramente respiratório,
  // não deixamos image_key antiga/errada de neurologia dominar.
  if (hasRespiratory && !hasNeuro) return 'respiratoria';

  // Se tiver AVC/disfagia/Parkinson/neuro, neurologia continua prioritária,
  // mesmo que o artigo também mencione respiração.
  if (hasNeuro) return 'neurologia';

  if (hasPelvic) return 'pelvica';
  if (hasWomanHealth && !hasPelvic) return 'saude_mulher';
  if (hasManHealth && !hasPelvic) return 'saude_homem';
  if (hasDermato) return 'dermato';
  if (hasGeriatric) return 'geriatria';
  if (hasOrtho) return 'ortopedia';
  if (hasRespiratory) return 'respiratoria';

  return null;
};

export const resolveClinicalImageMatch = (input: ClinicalImageInput): ClinicalImageMatch => {
  const text = normalizeText(`${input.category || ''} ${input.title || ''} ${input.summary || ''}`);

  // 1) Primeiro validamos o tema claro pelo próprio texto.
  // Isso corrige casos em que o Groq/Supabase salvou image_key errada.
  const forcedKey = clearTopicOverride(text);
  if (forcedKey && LOCAL_IMAGES[forcedKey]) return LOCAL_IMAGES[forcedKey];

  // 2) Só depois confiamos na image_key salva.
  const imageKey = normalizeImageKey(input.imageKey);
  if (imageKey && LOCAL_IMAGES[imageKey]) return LOCAL_IMAGES[imageKey];

  // 3) Fallback por pontuação.
  const scores: Record<keyof typeof LOCAL_IMAGES, number> = {
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
    'neurologia', 'neurologica', 'avc', 'stroke', 'acidente vascular cerebral',
    'parkinson', 'cerebral', 'neuroplasticidade', 'hemiparesia', 'hemiplegia',
    'marcha', 'equilibrio', 'coordenacao', 'disfagia', 'degluticao',
    'vestibular', 'motora', 'neuro',
  ]);

  scores.neuro += countMatches(text, [
    'neuro', 'sistema nervoso', 'controle motor', 'coordenacao respiratoria',
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
    'autonomia', 'mobilidade em idosos',
  ]);

  scores.respiratoria += countMatches(text, [
    'respiratoria', 'respiratorio', 'cardiorrespiratoria', 'cardiorrespiratorio',
    'cardiaca', 'cardiaco', 'cardiopulmonar', 'reabilitacao cardiaca',
    'pulmonar', 'pulmao', 'dpoc', 'asma', 'ventilacao', 'oxigenio',
    'dispneia', 'espirometria', 'respiracao', 'condicionamento',
    'bicicleta', 'ergometrica', 'aerobico',
  ]);

  scores.pelvica += countMatches(text, [
    'pelvica', 'assoalho pelvico', 'incontinencia', 'urinaria',
    'uroginecologica', 'perineo', 'dor pelvica', 'prolapso',
  ]);

  scores.saude_mulher += countMatches(text, [
    'saude da mulher', 'mulher', 'mulheres', 'feminina',
    'gestante', 'gestacao', 'gravidez', 'pos-parto',
    'menopausa', 'mama', 'mamaria', 'endometriose',
  ]);

  scores.saude_homem += countMatches(text, [
    'saude do homem', 'homem', 'homens', 'masculina',
    'prostata', 'prostatico', 'erecao', 'urologica',
  ]);

  scores.dermato += countMatches(text, [
    'dermato', 'dermatofuncional', 'pele', 'cicatriz', 'cicatrizacao',
    'queimadura', 'linfedema', 'edema', 'fibrose',
    'pos-operatorio', 'estetica', 'drenagem',
  ]);

  scores.medicina_geral += countMatches(text, [
    'medicina geral', 'saude geral', 'clinica',
    'prevencao', 'qualidade de vida', 'estudo', 'pesquisa',
    'evidencia', 'tratamento', 'reabilitacao',
  ]);

  if (scores.neurologia > 0 && /avc|stroke|parkinson|neurolog|neuro|disfagia|deglut/.test(text)) {
    scores.neurologia += 4;
  }

  if (scores.respiratoria > 0 && /respirat|pulmonar|dpoc|asma|cardio|ventil|dispneia|oxigen/.test(text)) {
    scores.respiratoria += 4;
  }

  if (scores.pelvica > 0) scores.pelvica += 3;
  if (scores.saude_mulher > 0 && scores.pelvica === 0) scores.saude_mulher += 2;
  if (scores.saude_homem > 0 && scores.pelvica === 0) scores.saude_homem += 2;

  const bestKey = (Object.keys(scores) as Array<keyof typeof LOCAL_IMAGES>)
    .sort((a, b) => scores[b] - scores[a])[0];

  if (!bestKey || scores[bestKey] <= 0) return FALLBACK_IMAGE;
  return LOCAL_IMAGES[bestKey] || FALLBACK_IMAGE;
};

export const resolveClinicalImage = (input: ClinicalImageInput) => {
  const isManualOrSystem = ['manual', 'sistema'].includes(normalizeText(input.sourceType));
  if (isManualOrSystem && input.imageUrl) return input.imageUrl;

  return resolveClinicalImageMatch(input).src;
};

export const resolveClinicalImageLabel = (input: ClinicalImageInput) => {
  return resolveClinicalImageMatch(input).label;
};
