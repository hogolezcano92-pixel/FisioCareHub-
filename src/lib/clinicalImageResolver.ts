export type ClinicalImageInput = {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  sourceType?: string | null;
  imageUrl?: string | null;
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
    // Mantive o nome exatamente como aparece no GitHub.
    // Se você renomear para respiratoria.jpg, troque este caminho também.
    src: '/clinical-updates/respiratória.jpg',
  },
  pelvica: {
    key: 'pelvica',
    label: 'Saúde pélvica',
    src: '/clinical-updates/pelvica.jpg',
  },
  saude_mulher: {
    key: 'saude_mulher',
    label: 'Saúde da mulher',
    // Mantive o nome exatamente como aparece no GitHub.
    // Se você renomear para saude-da-mulher.jpg, troque este caminho também.
    src: '/clinical-updates/Saude-da-mulher.jpg',
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

export const resolveClinicalImageMatch = (input: ClinicalImageInput): ClinicalImageMatch => {
  const text = normalizeText(`${input.category || ''} ${input.title || ''} ${input.summary || ''}`);

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
    'marcha', 'equilibrio', 'coordenacao', 'coordenação', 'disfagia', 'degluticao',
    'vestibular', 'motora', 'neuro',
  ]);

  scores.neuro += countMatches(text, [
    'neuro', 'sistema nervoso', 'controle motor', 'coordenação respiratória',
    'coordenacao respiratoria', 'respiração e deglutição', 'respiracao e degluticao',
  ]);

  scores.ortopedia += countMatches(text, [
    'ortopedia', 'ortopedica', 'musculoesqueletica', 'musculoesqueletico',
    'joelho', 'ombro', 'quadril', 'tornozelo', 'coluna', 'lombar', 'lombalgia',
    'cervical', 'artrose', 'osteoartrite', 'tendinite', 'tendinopatia', 'lca',
    'ligamento', 'fratura', 'dor', 'lesao', 'lesão',
  ]);

  scores.geriatria += countMatches(text, [
    'geriatria', 'geriatrica', 'idoso', 'idosa', 'idosos', 'envelhecimento',
    'queda', 'quedas', 'fragilidade', 'sarcopenia', 'osteoporose', 'longevidade',
    'autonomia', 'mobilidade em idosos',
  ]);

  scores.respiratoria += countMatches(text, [
    'respiratoria', 'respiratorio', 'cardiorrespiratoria', 'cardiorrespiratorio',
    'pulmonar', 'pulmao', 'pulmão', 'dpoc', 'asma', 'ventilacao', 'ventilação',
    'oxigenio', 'oxigênio', 'dispneia', 'espirometria', 'respiracao', 'respiração',
    'condicionamento', 'bicicleta', 'ergometrica', 'ergométrica', 'aerobico', 'aeróbico',
  ]);

  scores.pelvica += countMatches(text, [
    'pelvica', 'pélvica', 'assoalho pelvico', 'assoalho pélvico',
    'incontinencia', 'incontinência', 'urinaria', 'urinária', 'uroginecologica',
    'uroginecológica', 'perineo', 'períneo', 'dor pelvica', 'dor pélvica',
    'prolapso',
  ]);

  scores.saude_mulher += countMatches(text, [
    'saude da mulher', 'saúde da mulher', 'mulher', 'mulheres', 'feminina',
    'gestante', 'gestacao', 'gestação', 'gravidez', 'pos-parto', 'pós-parto',
    'menopausa', 'mama', 'mamaria', 'mamária', 'endometriose',
  ]);

  scores.saude_homem += countMatches(text, [
    'saude do homem', 'saúde do homem', 'homem', 'homens', 'masculina',
    'prostata', 'próstata', 'prostatico', 'prostático', 'erecao', 'ereção',
    'urologica', 'urológica',
  ]);

  scores.dermato += countMatches(text, [
    'dermato', 'dermatofuncional', 'pele', 'cicatriz', 'cicatrização',
    'cicatrizacao', 'queimadura', 'linfedema', 'edema', 'fibrose',
    'pos-operatorio', 'pós-operatório', 'estetica', 'estética', 'drenagem',
  ]);

  scores.medicina_geral += countMatches(text, [
    'medicina geral', 'saude geral', 'saúde geral', 'clinica', 'clínica',
    'prevencao', 'prevenção', 'qualidade de vida', 'estudo', 'pesquisa',
    'evidencia', 'evidência', 'tratamento', 'reabilitacao', 'reabilitação',
  ]);

  // Regras de prioridade para temas que se misturam.
  // Ex.: pós-AVC com respiração deve continuar como neurologia.
  if (scores.neurologia > 0 && /avc|stroke|parkinson|neurolog|neuro|disfagia|deglut/.test(text)) {
    scores.neurologia += 4;
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
