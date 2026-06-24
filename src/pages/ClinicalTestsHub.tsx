import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bone,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  HeartPulse,
  Info,
  Layers,
  PlayCircle,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Target,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ClinicalTest {
  id: string;
  name: string;
  region: string;
  category: string;
  objective: string;
  execution: string;
  positive: string;
  negative: string;
  interpretation: string;
  precautions: string;
  demo: string;
  image_url?: string | null;
  video_url?: string | null;
  video_provider?: string | null;
  video_thumbnail_url?: string | null;
  video_source_url?: string | null;
  video_license?: string | null;
  video_status?: string | null;
  video_transcript_original?: string | null;
  video_transcript_pt?: string | null;
  video_subtitle_vtt_pt?: string | null;
  video_subtitle_status?: string | null;
  video_subtitle_reviewed?: boolean | null;
  video_subtitle_generated_at?: string | null;
  source_provider?: string | null;
  source_url?: string | null;
  source_title?: string | null;
  source_attribution?: string | null;
  image_source_url?: string | null;
  image_license?: string | null;
  image_attribution?: string | null;
  import_status?: string | null;
  reviewed_by_admin?: boolean | null;
  isImported?: boolean;
  recordSuggestion: string;
  level: 'Essencial' | 'Intermediário' | 'Avançado';
  gradient: string;
  icon: typeof Activity;
}

type ClinicalTestResult = 'positivo' | 'negativo' | 'inconclusivo';

interface ClinicalResultOption {
  value: ClinicalTestResult;
  label: string;
  description: string;
}

interface ClinicalPatient {
  id: string;
  nome?: string | null;
  nome_completo?: string | null;
  email?: string | null;
  telefone?: string | null;
  diagnostico?: string | null;
  perfil_id?: string | null;
  tipo_paciente?: string | null;
  origem?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
}

const categories = [
  'Todos',
  'Ombro',
  'Joelho',
  'Quadril',
  'Tornozelo',
  'Tornozelo/Pé',
  'Coluna',
  'Coluna cervical',
  'Coluna lombar',
  'Coluna torácica',
  'Cotovelo',
  'Punho/Mão',
  'Pelve/Sacroilíaca',
  'Neurodinâmico',
  'Neurofuncional',
  'Funcional',
  'Cardiorrespiratório',
];

const clinicalResultOptions: ClinicalResultOption[] = [
  {
    value: 'positivo',
    label: 'Positivo',
    description: 'Houve reprodução de dor, sintoma ou achado compatível.',
  },
  {
    value: 'negativo',
    label: 'Negativo',
    description: 'Não houve reprodução de dor, sintoma ou achado relevante.',
  },
  {
    value: 'inconclusivo',
    label: 'Inconclusivo',
    description: 'Teste não foi concluído ou precisa de correlação clínica.',
  },
];

const getClinicalResultLabel = (result?: ClinicalTestResult | '') => {
  return clinicalResultOptions.find((option) => option.value === result)?.label || 'Não informado';
};

const getClinicalResultInterpretation = (test: ClinicalTest, result?: ClinicalTestResult | '') => {
  if (result === 'positivo') return test.positive;
  if (result === 'negativo') return test.negative;
  if (result === 'inconclusivo') return 'Resultado inconclusivo: correlacionar com história clínica, sintomas, exame físico e demais testes complementares.';
  return 'Resultado não informado no momento do registro.';
};

const clinicalTests: ClinicalTest[] = [
  {
    id: 'neer',
    name: 'Teste de Neer',
    region: 'Ombro',
    category: 'Ortopédico',
    objective: 'Investigar sinais compatíveis com impacto subacromial e irritação dolorosa no ombro.',
    execution: 'Elevação passiva do membro superior em flexão, com estabilização escapular e observação da resposta dolorosa.',
    positive: 'Dor na região anterior ou lateral do ombro durante a elevação passiva.',
    negative: 'Ausência de dor ou desconforto relevante durante a elevação controlada.',
    interpretation: 'Pode sugerir irritação subacromial, tendinopatia do manguito rotador ou conflito mecânico funcional.',
    precautions: 'Evite força excessiva e correlacione com história clínica, arco doloroso e outros testes do ombro.',
    demo: 'Imagem/vídeo sugerido: paciente sentado, terapeuta estabiliza a escápula e eleva passivamente o braço no plano sagital.',
    recordSuggestion: 'Teste de Neer: registrar lado avaliado, presença ou ausência de dor, intensidade, arco doloroso e comparação bilateral.',
    level: 'Essencial',
    gradient: 'from-sky-500 via-blue-500 to-indigo-600',
    icon: Bone,
  },
  {
    id: 'hawkins',
    name: 'Hawkins-Kennedy',
    region: 'Ombro',
    category: 'Ortopédico',
    objective: 'Avaliar possível compressão subacromial durante rotação interna do ombro.',
    execution: 'Ombro e cotovelo a 90°, realizando rotação interna controlada do ombro.',
    positive: 'Reprodução de dor no ombro durante a manobra.',
    negative: 'Sem reprodução de dor ou sintomas durante a rotação interna controlada.',
    interpretation: 'Achado compatível com síndrome do impacto quando associado a outros sinais clínicos.',
    precautions: 'Não interpretar isoladamente; observar irritabilidade, amplitude e tolerância do paciente.',
    demo: 'Imagem/vídeo sugerido: ombro e cotovelo a 90°, terapeuta realiza rotação interna controlada.',
    recordSuggestion: 'Hawkins-Kennedy: registrar lado, resposta dolorosa, localização da dor e relação com sintomas funcionais.',
    level: 'Essencial',
    gradient: 'from-cyan-500 via-blue-500 to-violet-600',
    icon: Target,
  },
  {
    id: 'jobe',
    name: 'Teste de Jobe',
    region: 'Ombro',
    category: 'Ortopédico',
    objective: 'Avaliar dor ou déficit de força relacionado ao supraespinal.',
    execution: 'Elevar os braços no plano da escápula com polegares para baixo e aplicar resistência manual.',
    positive: 'Dor, fraqueza ou incapacidade de sustentar a posição contra resistência.',
    negative: 'Mantém a posição contra resistência sem dor relevante ou perda de força comparativa.',
    interpretation: 'Pode sugerir disfunção do supraespinal, tendinopatia ou alteração de controle escapular.',
    precautions: 'Comparar bilateralmente e diferenciar dor de fraqueza real.',
    demo: 'Imagem/vídeo sugerido: braços no plano da escápula, polegares para baixo e resistência manual bilateral.',
    recordSuggestion: 'Teste de Jobe: registrar dor, força, compensações escapulares e diferença entre os lados.',
    level: 'Intermediário',
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-600',
    icon: Activity,
  },
  {
    id: 'lachman',
    name: 'Lachman',
    region: 'Joelho',
    category: 'Ortopédico',
    objective: 'Avaliar estabilidade anterior do joelho e possível comprometimento do LCA.',
    execution: 'Joelho em leve flexão, estabilizando fêmur e tracionando a tíbia anteriormente.',
    positive: 'Translação anterior aumentada ou sensação de parada final amolecida.',
    negative: 'Parada final firme e translação semelhante ao joelho contralateral.',
    interpretation: 'Achado sugestivo de instabilidade anterior, especialmente quando comparado ao lado contralateral.',
    precautions: 'Evitar em trauma agudo muito doloroso sem avaliação médica; observar edema e proteção muscular.',
    demo: 'Imagem/vídeo sugerido: joelho em leve flexão, uma mão estabiliza o fêmur e a outra traciona a tíbia anteriormente.',
    recordSuggestion: 'Lachman: registrar lado, grau de translação, qualidade da parada final, dor, edema e comparação bilateral.',
    level: 'Avançado',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    icon: ShieldCheck,
  },
  {
    id: 'mcmurray',
    name: 'McMurray',
    region: 'Joelho',
    category: 'Ortopédico',
    objective: 'Investigar sinais compatíveis com lesão meniscal.',
    execution: 'Flexão e extensão do joelho associadas a rotação tibial e estresse em varo ou valgo.',
    positive: 'Dor articular, estalo doloroso ou bloqueio durante a manobra.',
    negative: 'Sem dor articular, estalo doloroso ou sensação de bloqueio durante o movimento.',
    interpretation: 'Pode indicar envolvimento meniscal, especialmente com dor localizada e história compatível.',
    precautions: 'Executar com suavidade; não forçar amplitudes dolorosas.',
    demo: 'Imagem/vídeo sugerido: terapeuta mobiliza o joelho em flexão/extensão com rotações tibiais e estresse controlado.',
    recordSuggestion: 'McMurray: registrar compartimento suspeito, dor, estalo, bloqueio e resposta durante rotação medial/lateral.',
    level: 'Intermediário',
    gradient: 'from-lime-500 via-emerald-500 to-teal-600',
    icon: ClipboardCheck,
  },
  {
    id: 'slump',
    name: 'Slump Test',
    region: 'Coluna',
    category: 'Neurodinâmico',
    objective: 'Avaliar mecanossensibilidade neural e sintomas irradiados em membros inferiores.',
    execution: 'Paciente sentado, flexão cervical/torácica, extensão de joelho e dorsiflexão, modulando os sintomas.',
    positive: 'Reprodução dos sintomas neurais com alteração pela posição cervical ou tornozelo.',
    negative: 'Ausência de sintomas neurais ou desconforto apenas muscular sem modulação cervical/tornozelo.',
    interpretation: 'Pode sugerir sensibilização neural ou componente neurodinâmico nos sintomas.',
    precautions: 'Diferenciar tensão muscular de sintoma neural; respeitar irritabilidade.',
    demo: 'Imagem/vídeo sugerido: paciente sentado, progressão com flexão torácica/cervical, extensão de joelho e dorsiflexão.',
    recordSuggestion: 'Slump Test: registrar lado, sintomas reproduzidos, modulação com cervical/tornozelo e irritabilidade neural.',
    level: 'Avançado',
    gradient: 'from-orange-500 via-rose-500 to-pink-600',
    icon: Zap,
  },
  {
    id: 'spurling',
    name: 'Spurling',
    region: 'Coluna',
    category: 'Cervical',
    objective: 'Investigar reprodução de sintomas cervicobraquiais por compressão foraminal.',
    execution: 'Extensão, inclinação e rotação cervical com compressão axial controlada.',
    positive: 'Reprodução de dor irradiada ou sintomas no membro superior.',
    negative: 'Não reproduz dor irradiada ou sintomas neurológicos no membro superior.',
    interpretation: 'Pode indicar envolvimento radicular quando associado a exame neurológico e história clínica.',
    precautions: 'Evitar em sinais neurológicos graves, trauma, tontura intensa ou suspeita vascular.',
    demo: 'Imagem/vídeo sugerido: posicionamento cervical em extensão/inclinação/rotação com compressão axial leve e controlada.',
    recordSuggestion: 'Spurling: registrar direção testada, sintomas irradiados, dermátomo provável, intensidade e sinais neurológicos associados.',
    level: 'Avançado',
    gradient: 'from-amber-500 via-orange-500 to-red-600',
    icon: Brain,
  },
  {
    id: 'tug',
    name: 'Timed Up and Go',
    region: 'Funcional',
    category: 'Funcional',
    objective: 'Avaliar mobilidade funcional, equilíbrio dinâmico e risco funcional em idosos ou pacientes frágeis.',
    execution: 'Paciente levanta da cadeira, caminha 3 metros, retorna e senta; registrar o tempo total.',
    positive: 'Tempo elevado, instabilidade, hesitação ou necessidade de ajuda durante o percurso.',
    negative: 'Realiza a tarefa com segurança, sem instabilidade relevante e dentro do esperado para o perfil funcional.',
    interpretation: 'Ajuda a monitorar evolução funcional e risco de queda no contexto clínico.',
    precautions: 'Garantir segurança, cadeira adequada e supervisão próxima.',
    demo: 'Imagem/vídeo sugerido: cadeira, marcação de 3 metros, levantar, caminhar, retornar e sentar com cronômetro.',
    recordSuggestion: 'Timed Up and Go: registrar tempo total, necessidade de auxílio, instabilidade, dor e estratégia de marcha.',
    level: 'Essencial',
    gradient: 'from-purple-500 via-violet-500 to-indigo-600',
    icon: HeartPulse,
  },
  {
    id: 'six-minute-walk',
    name: 'Teste de Caminhada 6 Min',
    region: 'Cardiorrespiratório',
    category: 'Capacidade funcional',
    objective: 'Mensurar tolerância ao esforço, capacidade funcional e resposta cardiorrespiratória.',
    execution: 'Paciente caminha por 6 minutos em percurso padronizado, monitorando sintomas e sinais vitais.',
    positive: 'Queda importante de desempenho, dispneia intensa, dessaturação ou sintomas limitantes.',
    negative: 'Completa o teste sem sinais limitantes relevantes e com resposta cardiorrespiratória compatível.',
    interpretation: 'Útil para evolução, prescrição de exercício e acompanhamento cardiorrespiratório.',
    precautions: 'Monitorar segurança, Borg, pressão, frequência cardíaca e saturação quando indicado.',
    demo: 'Imagem/vídeo sugerido: percurso padronizado, cronômetro de 6 minutos, registro de distância, Borg e sinais vitais.',
    recordSuggestion: 'Teste de Caminhada 6 Min: registrar distância, pausas, Borg, FC, SpO₂, sintomas e tolerância ao esforço.',
    level: 'Intermediário',
    gradient: 'from-red-500 via-rose-500 to-fuchsia-600',
    icon: HeartPulse,
  },
];

const stats = [
  { label: 'Testes clínicos', value: clinicalTests.length, icon: ClipboardCheck },
  { label: 'Categorias', value: categories.length - 1, icon: Layers },
  { label: 'Protocolos premium', value: 4, icon: Sparkles },
];

const safeWrapStyle = {
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  whiteSpace: 'normal',
} as const;

const CLINICAL_TESTS_SELECT_WITH_IMPORT = [
  'id',
  'name',
  'region',
  'category',
  'demo',
  'image_url',
  'video_url',
  'video_provider',
  'video_thumbnail_url',
  'video_source_url',
  'video_license',
  'video_status',
  'video_transcript_original',
  'video_transcript_pt',
  'video_subtitle_vtt_pt',
  'video_subtitle_status',
  'video_subtitle_reviewed',
  'video_subtitle_generated_at',
  'is_active',
  'source_provider',
  'source_url',
  'source_title',
  'source_attribution',
  'image_source_url',
  'image_license',
  'image_attribution',
  'import_status',
  'reviewed_by_admin',
].join(', ');

const CLINICAL_TESTS_BASIC_SELECT = 'id, name, region, category, demo, image_url, video_url, is_active';

const normalizeForClinicalCompare = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cleanClinicalText = (value?: string | null, fallback = '') => {
  const text = String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text || fallback;
};

const removeSourceLines = (value?: string | null) =>
  cleanClinicalText(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^fonte\s*(original)?\s*:/i.test(line))
    .join('\n')
    .trim();

const clinicalSectionAliases: Record<string, string[]> = {
  objective: ['objetivo', 'objetivo clinico', 'objective'],
  indication: ['indicacao', 'indicacoes', 'indicação', 'indicações', 'quando usar'],
  execution: ['como executar', 'execucao', 'execução', 'procedimento', 'como e feito', 'como é feito'],
  positive: ['sinal positivo', 'resultado positivo', 'positivo', 'teste positivo'],
  negative: ['sinal negativo', 'resultado negativo', 'negativo', 'teste negativo'],
  interpretation: ['interpretacao', 'interpretação', 'interpretacao cuidados', 'interpretação cuidados', 'interpretacao/cuidados', 'interpretação/cuidados'],
  precautions: ['cuidados', 'contraindicacoes', 'contraindicações', 'precaucoes', 'precauções'],
};

const resolveClinicalSectionKey = (label: string) => {
  const normalizedLabel = normalizeForClinicalCompare(label);
  return Object.entries(clinicalSectionAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizedLabel === normalizeForClinicalCompare(alias) || normalizedLabel.includes(normalizeForClinicalCompare(alias)))
  )?.[0] || '';
};

const parseClinicalDemoSections = (demo?: string | null) => {
  const sections: Record<string, string[]> = {};
  let currentKey = '';

  cleanClinicalText(demo)
    .replace(/\s+(Objetivo|Objetivo clínico|Indicacao|Indicação|Indicações|Como executar|Execução|Procedimento|Sinal positivo|Resultado positivo|Sinal negativo|Resultado negativo|Interpretação\/cuidados|Interpretação|Cuidados|Contraindicações|Precauções|Fonte original|Fonte)\s*:/gi, '\n$1:')
    .split('\n')
    .map((line) => line.trim().replace(/^[-•#\s]+/, '').trim())
    .filter(Boolean)
    .forEach((line) => {
      const colonMatch = line.match(/^([^:：–—-]{2,72})\s*[:：–—-]\s*(.*)$/);
      const exactKey = resolveClinicalSectionKey(line);
      const key = colonMatch ? resolveClinicalSectionKey(colonMatch[1]) : exactKey;

      if (key) {
        currentKey = key;
        const remainder = colonMatch?.[2]?.trim();
        if (remainder) sections[currentKey] = [...(sections[currentKey] || []), remainder];
        return;
      }

      if (currentKey) {
        sections[currentKey] = [...(sections[currentKey] || []), line];
      }
    });

  return Object.fromEntries(
    Object.entries(sections).map(([key, values]) => [key, removeSourceLines(values.join(' '))])
  ) as Record<string, string>;
};

const isImportColumnError = (error: any) => {
  const message = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' ').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
};

const shouldExposeClinicalRow = (row: any) => {
  if (!row || row.is_active === false) return false;

  const sourceProvider = String(row.source_provider || '').toLowerCase();
  if (!sourceProvider) return true;

  const importStatus = String(row.import_status || '').toLowerCase();
  return row.reviewed_by_admin === true || importStatus === 'published' || importStatus === 'reviewed';
};

const getClinicalGradient = (region?: string | null, index = 0) => {
  const normalizedRegion = normalizeForClinicalCompare(region);
  if (normalizedRegion.includes('ombro')) return 'from-sky-500 via-blue-500 to-indigo-600';
  if (normalizedRegion.includes('joelho')) return 'from-emerald-500 via-teal-500 to-cyan-600';
  if (normalizedRegion.includes('quadril') || normalizedRegion.includes('pelve')) return 'from-fuchsia-500 via-violet-500 to-indigo-600';
  if (normalizedRegion.includes('tornozelo') || normalizedRegion.includes('pe')) return 'from-lime-500 via-emerald-500 to-teal-600';
  if (normalizedRegion.includes('coluna') || normalizedRegion.includes('cervical') || normalizedRegion.includes('lombar')) return 'from-amber-500 via-orange-500 to-red-600';
  if (normalizedRegion.includes('cotovelo') || normalizedRegion.includes('punho') || normalizedRegion.includes('mao')) return 'from-cyan-500 via-blue-500 to-violet-600';
  if (normalizedRegion.includes('neuro')) return 'from-orange-500 via-rose-500 to-pink-600';
  if (normalizedRegion.includes('cardio')) return 'from-red-500 via-rose-500 to-fuchsia-600';
  const gradients = [
    'from-blue-500 via-violet-500 to-fuchsia-600',
    'from-indigo-500 via-violet-500 to-fuchsia-600',
    'from-purple-500 via-violet-500 to-indigo-600',
  ];
  return gradients[index % gradients.length];
};

const getClinicalIcon = (region?: string | null, category?: string | null) => {
  const normalized = normalizeForClinicalCompare(`${region || ''} ${category || ''}`);
  if (normalized.includes('neuro') || normalized.includes('cervical') || normalized.includes('lombar')) return Brain;
  if (normalized.includes('funcional') || normalized.includes('cardio')) return HeartPulse;
  if (normalized.includes('joelho') || normalized.includes('ombro') || normalized.includes('quadril') || normalized.includes('tornozelo')) return Bone;
  if (normalized.includes('cotovelo') || normalized.includes('punho') || normalized.includes('mao')) return Activity;
  return Stethoscope;
};


const shouldDisplayClinicalVideo = (test?: ClinicalTest | null) => {
  if (!test?.video_url) return false;
  const status = normalizeForClinicalCompare(test.video_status || '');
  return status !== 'rejected' && status !== 'rejeitado';
};

const extractClinicalYoutubeId = (url?: string | null) => {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0] || '';
    if (host.endsWith('youtube.com')) {
      const watchId = parsed.searchParams.get('v');
      if (watchId) return watchId;
      const embedMatch = parsed.pathname.match(/\/(?:embed|shorts|v)\/([^/?#]+)/i);
      if (embedMatch?.[1]) return embedMatch[1];
    }
  } catch {
    const fallback = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([^&?#/]+)/i);
    return fallback?.[1] || '';
  }

  return '';
};

const extractClinicalVimeoId = (url?: string | null) => {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.endsWith('vimeo.com')) return '';
    const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] || '';
  } catch {
    const fallback = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return fallback?.[1] || '';
  }

  return '';
};

const getClinicalVideoEmbedUrl = (url?: string | null, provider?: string | null) => {
  const normalizedProvider = normalizeForClinicalCompare(provider || '');
  const youtubeId = extractClinicalYoutubeId(url);
  if (youtubeId || normalizedProvider.includes('youtube')) {
    return youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : '';
  }

  const vimeoId = extractClinicalVimeoId(url);
  if (vimeoId || normalizedProvider.includes('vimeo')) {
    return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : '';
  }

  return '';
};

const isDirectClinicalVideoUrl = (url?: string | null) => /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url || ''));

const getClinicalVideoLabel = (provider?: string | null) => {
  const normalizedProvider = normalizeForClinicalCompare(provider || '');
  if (normalizedProvider.includes('youtube')) return 'YouTube';
  if (normalizedProvider.includes('vimeo')) return 'Vimeo';
  if (normalizedProvider.includes('video')) return 'Vídeo externo';
  return 'Vídeo demonstrativo';
};

const decodeClinicalVttText = (vtt?: string | null) => {
  const raw = cleanClinicalText(vtt);
  if (!raw) return '';

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^WEBVTT/i.test(line)) return false;
      if (/^NOTE\b/i.test(line)) return false;
      if (/^\d+$/.test(line)) return false;
      if (/-->/.test(line)) return false;
      return true;
    })
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getClinicalVideoTranscript = (test?: ClinicalTest | null) => {
  return cleanClinicalText(test?.video_transcript_pt) || decodeClinicalVttText(test?.video_subtitle_vtt_pt);
};

const hasClinicalVideoTranscript = (test?: ClinicalTest | null) => Boolean(getClinicalVideoTranscript(test));

const getClinicalSubtitleStatusLabel = (status?: string | null, reviewed?: boolean | null) => {
  const normalizedStatus = normalizeForClinicalCompare(status || '');
  if (reviewed === true || normalizedStatus === 'reviewed' || normalizedStatus === 'published') return 'Legenda revisada';
  if (normalizedStatus === 'draft') return 'Legenda em rascunho';
  if (normalizedStatus === 'generated') return 'Legenda gerada';
  if (normalizedStatus === 'not generated' || normalizedStatus === 'nao gerada') return 'Legenda não gerada';
  return status ? `Legenda: ${status}` : 'Legenda PT-BR';
};

const getClinicalSubtitleTrackSrc = (vtt?: string | null) => {
  const raw = String(vtt || '').trim();
  if (!raw) return '';
  const normalized = /^WEBVTT/i.test(raw) ? raw : `WEBVTT\n\n${raw}`;
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(normalized)}`;
};

const inferImportedLevel = (demo?: string | null, category?: string | null): ClinicalTest['level'] => {
  const normalized = normalizeForClinicalCompare(`${demo || ''} ${category || ''}`);
  if (normalized.includes('contraindic') || normalized.includes('radicular') || normalized.includes('instabilidade') || normalized.includes('neuro')) return 'Avançado';
  if (normalized.includes('menisc') || normalized.includes('compress') || normalized.includes('resistencia')) return 'Intermediário';
  return 'Essencial';
};

const mapImportedClinicalTest = (row: any, index = 0): ClinicalTest => {
  const demo = cleanClinicalText(row?.demo, 'Rascunho revisado pelo Admin. Complete as informações clínicas conforme necessário.');
  const sections = parseClinicalDemoSections(demo);
  const name = cleanClinicalText(row?.name || row?.source_title, 'Teste clínico');
  const region = cleanClinicalText(row?.region, 'Ortopédico');
  const category = cleanClinicalText(row?.category, 'Ortopédico');
  const objective = removeSourceLines(sections.objective || sections.indication || demo.split('\n')[0]);
  const execution = removeSourceLines(sections.execution || 'Completar na revisão clínica antes de aplicar no paciente.');
  const positive = removeSourceLines(sections.positive || 'Completar sinal positivo na revisão clínica.');
  const negative = removeSourceLines(sections.negative || 'Resultado negativo: ausência de reprodução dos sinais descritos, quando aplicável e validado pelo fisioterapeuta.');
  const interpretation = removeSourceLines(sections.interpretation || 'Interpretar junto com história clínica, exame físico e demais achados funcionais.');
  const precautions = removeSourceLines(sections.precautions || 'Aplicar com critério profissional, respeitando dor, irritabilidade, contraindicações e segurança do paciente.');

  return {
    id: String(row?.id || `clinical-test-${index}`),
    name,
    region,
    category,
    objective,
    execution,
    positive,
    negative,
    interpretation,
    precautions,
    demo,
    image_url: row?.image_url || null,
    video_url: row?.video_url || null,
    video_provider: row?.video_provider || null,
    video_thumbnail_url: row?.video_thumbnail_url || null,
    video_source_url: row?.video_source_url || null,
    video_license: row?.video_license || null,
    video_status: row?.video_status || null,
    video_transcript_original: row?.video_transcript_original || null,
    video_transcript_pt: row?.video_transcript_pt || null,
    video_subtitle_vtt_pt: row?.video_subtitle_vtt_pt || null,
    video_subtitle_status: row?.video_subtitle_status || null,
    video_subtitle_reviewed: row?.video_subtitle_reviewed ?? null,
    video_subtitle_generated_at: row?.video_subtitle_generated_at || null,
    source_provider: row?.source_provider || null,
    source_url: row?.source_url || null,
    source_title: row?.source_title || null,
    source_attribution: row?.source_attribution || null,
    image_source_url: row?.image_source_url || null,
    image_license: row?.image_license || null,
    image_attribution: row?.image_attribution || null,
    import_status: row?.import_status || null,
    reviewed_by_admin: row?.reviewed_by_admin ?? null,
    isImported: Boolean(row?.source_provider),
    recordSuggestion: `${name}: registrar lado avaliado, resposta do paciente, resultado, sinais reproduzidos, intensidade dos sintomas e correlação com o quadro funcional.`,
    level: inferImportedLevel(demo, category),
    gradient: getClinicalGradient(region, index),
    icon: getClinicalIcon(region, category),
  };
};

const mergeClinicalTestsWithRows = (rows: any[] = []) => {
  const activeRows = rows.filter(shouldExposeClinicalRow);
  const rowsById = new Map(activeRows.map((row) => [String(row.id || ''), row]));
  const usedIds = new Set<string>();

  const baseTests = clinicalTests.map((test) => {
    const row = rowsById.get(test.id) as any;
    usedIds.add(test.id);
    if (!row) return test;

    return {
      ...test,
      demo: cleanClinicalText(row.demo, test.demo),
      image_url: row.image_url || test.image_url || null,
      video_url: row.video_url || test.video_url || null,
      video_provider: row.video_provider || test.video_provider || null,
      video_thumbnail_url: row.video_thumbnail_url || test.video_thumbnail_url || null,
      video_source_url: row.video_source_url || test.video_source_url || null,
      video_license: row.video_license || test.video_license || null,
      video_status: row.video_status || test.video_status || null,
      video_transcript_original: row.video_transcript_original || test.video_transcript_original || null,
      video_transcript_pt: row.video_transcript_pt || test.video_transcript_pt || null,
      video_subtitle_vtt_pt: row.video_subtitle_vtt_pt || test.video_subtitle_vtt_pt || null,
      video_subtitle_status: row.video_subtitle_status || test.video_subtitle_status || null,
      video_subtitle_reviewed: row.video_subtitle_reviewed ?? test.video_subtitle_reviewed ?? null,
      video_subtitle_generated_at: row.video_subtitle_generated_at || test.video_subtitle_generated_at || null,
      source_provider: row.source_provider || test.source_provider || null,
      source_url: row.source_url || test.source_url || null,
      source_title: row.source_title || test.source_title || null,
      source_attribution: row.source_attribution || test.source_attribution || null,
      image_source_url: row.image_source_url || test.image_source_url || null,
      image_license: row.image_license || test.image_license || null,
      image_attribution: row.image_attribution || test.image_attribution || null,
      import_status: row.import_status || test.import_status || null,
      reviewed_by_admin: row.reviewed_by_admin ?? test.reviewed_by_admin ?? null,
      isImported: Boolean(row.source_provider || test.isImported),
    };
  });

  const importedTests = activeRows
    .filter((row) => row?.id && !usedIds.has(String(row.id)))
    .map((row, index) => mapImportedClinicalTest(row, index));

  return [...baseTests, ...importedTests].sort((a, b) => {
    const regionCompare = a.region.localeCompare(b.region, 'pt-BR');
    if (regionCompare !== 0) return regionCompare;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
};

const getPatientName = (patient?: ClinicalPatient | null) => {
  return String(patient?.nome_completo || patient?.nome || 'Paciente sem nome').trim() || 'Paciente sem nome';
};

const getPatientSubtitle = (patient?: ClinicalPatient | null) => {
  const parts = [patient?.email, patient?.telefone, patient?.diagnostico].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Paciente cadastrado';
};

const buildClinicalTestDocumentContent = (
  test: ClinicalTest,
  patient?: ClinicalPatient | null,
  result?: ClinicalTestResult | '',
  observation?: string,
) => {
  const patientName = getPatientName(patient);
  const resultLabel = getClinicalResultLabel(result);
  const resultInterpretation = getClinicalResultInterpretation(test, result);
  const cleanObservation = observation?.trim();

  return `# ${test.name}

**Tipo de documento:** Teste clínico / Exame funcional
**Paciente:** ${patientName}
**Região:** ${test.region}
**Categoria:** ${test.category}
**Nível:** ${test.level}
**Resultado do teste:** ${resultLabel}

## Resultado clínico registrado
${resultInterpretation}
${cleanObservation ? `
**Observação clínica:** ${cleanObservation}
` : ''}

## Objetivo
${test.objective}

## Como é feito
${test.execution}

## Resposta positiva esperada
${test.positive}

## Resposta negativa esperada
${test.negative}

## Interpretação clínica
${test.interpretation}

## Precauções
${test.precautions}

## Sugestão para registro clínico
${test.recordSuggestion}

## Demonstração
${test.demo}
${test.image_url ? `
## Imagem demonstrativa
${test.image_url}` : ''}
${shouldDisplayClinicalVideo(test) ? `
## Vídeo demonstrativo
${getClinicalVideoLabel(test.video_provider)}: ${test.video_url}` : ''}
${hasClinicalVideoTranscript(test) ? `
## Legenda / transcrição clínica em português
${getClinicalVideoTranscript(test)}` : ''}
${test.source_url ? `
## Fonte do teste
${test.source_provider === 'physiopedia' ? 'Physiopedia' : test.source_provider || 'Fonte externa'}: ${test.source_url}` : ''}

---
Documento clínico gerado pelo FisioCareHub para apoio ao prontuário e acompanhamento funcional do paciente.`;
};

export default function ClinicalTestsHub() {
  const { user, profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<ClinicalTest[]>(clinicalTests);
  const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(clinicalTests[0]);
  const [patients, setPatients] = useState<ClinicalPatient[]>([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [pendingRecordTest, setPendingRecordTest] = useState<ClinicalTest | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [clinicalResult, setClinicalResult] = useState<ClinicalTestResult | ''>('');
  const [clinicalObservation, setClinicalObservation] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    src: string;
    alt: string;
    title: string;
    sourceUrl?: string | null;
    attribution?: string | null;
  } | null>(null);
  const selectedTestDetailRef = useRef<HTMLDivElement | null>(null);

  const availableCategories = useMemo(() => {
    const dynamic = Array.from(new Set(tests.map((test) => test.region).filter(Boolean)));
    return ['Todos', ...Array.from(new Set([...categories.slice(1), ...dynamic]))];
  }, [tests]);

  const stats = useMemo(() => [
    { label: 'Testes clínicos', value: tests.length, icon: ClipboardCheck },
    { label: 'Categorias', value: Math.max(availableCategories.length - 1, 0), icon: Layers },
    { label: 'Importados publicados', value: tests.filter((test) => Boolean(test.source_provider)).length, icon: FileText },
  ], [availableCategories.length, tests]);

  useEffect(() => {
    let isMounted = true;

    const loadClinicalTestsFromDatabase = async () => {
      setTestsLoading(true);
      try {
        let result: any = await supabase
          .from('clinical_tests')
          .select(CLINICAL_TESTS_SELECT_WITH_IMPORT)
          .order('region', { ascending: true })
          .order('name', { ascending: true });

        if (result.error && isImportColumnError(result.error)) {
          result = await supabase
            .from('clinical_tests')
            .select(CLINICAL_TESTS_BASIC_SELECT)
            .order('region', { ascending: true })
            .order('name', { ascending: true });
        }

        if (result.error) {
          console.warn('Clinical tests not loaded from database:', result.error.message);
          return;
        }

        if (!isMounted) return;

        const nextTests = mergeClinicalTestsWithRows(Array.isArray(result.data) ? result.data : []);
        setTests(nextTests);
        setSelectedTest((current) => {
          if (!current) return nextTests[0] || null;
          return nextTests.find((test) => test.id === current.id) || nextTests[0] || null;
        });
      } catch (error) {
        console.warn('Clinical tests fetch failed:', error);
      } finally {
        if (isMounted) setTestsLoading(false);
      }
    };

    loadClinicalTestsFromDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!imagePreview || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagePreview(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imagePreview]);

  const filteredTests = useMemo(() => {
    const normalizedQuery = normalizeForClinicalCompare(query);
    const normalizedCategory = normalizeForClinicalCompare(activeCategory);

    return tests.filter((test) => {
      const normalizedRegion = normalizeForClinicalCompare(test.region);
      const normalizedTestCategory = normalizeForClinicalCompare(test.category);
      const matchesCategory = activeCategory === 'Todos'
        || normalizedRegion === normalizedCategory
        || normalizedTestCategory === normalizedCategory
        || normalizedRegion.includes(normalizedCategory)
        || normalizedCategory.includes(normalizedRegion);
      const searchable = normalizeForClinicalCompare([
        test.name,
        test.region,
        test.category,
        test.objective,
        test.source_title,
        test.demo,
      ].filter(Boolean).join(' '));
      const matchesSearch = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query, tests]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((patient) => {
      return [
        patient.nome_completo,
        patient.nome,
        patient.email,
        patient.telefone,
        patient.diagnostico,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [patientSearch, patients]);

  const openImagePreview = (test: ClinicalTest) => {
    if (!test.image_url) return;

    setImagePreview({
      src: test.image_url,
      alt: `Imagem demonstrativa - ${test.name}`,
      title: test.name,
      sourceUrl: test.image_source_url || test.source_url || null,
      attribution: test.image_attribution || test.source_attribution || null,
    });
  };

  const closeImagePreview = () => {
    setImagePreview(null);
  };

  const handleSelectTest = (test: ClinicalTest) => {
    setSelectedTest(test);

    window.requestAnimationFrame(() => {
      selectedTestDetailRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const loadPatientsForRecord = async () => {
    if (!user?.id) {
      toast.error('Faça login novamente para escolher um paciente.');
      return;
    }

    setPatientsLoading(true);
    try {
      const physioId = profile?.id || user.id;
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('fisioterapeuta_id', physioId);

      if (error) throw error;

      const orderedPatients = ((data || []) as ClinicalPatient[])
        .filter((patient) => Boolean(patient?.id))
        .sort((a, b) => getPatientName(a).localeCompare(getPatientName(b), 'pt-BR'));

      setPatients(orderedPatients);
      setPatientsLoaded(true);
      setSelectedPatientId((current) => {
        if (orderedPatients.some((patient) => patient.id === current)) return current;
        return orderedPatients[0]?.id || '';
      });
    } catch (error: any) {
      console.error('Erro ao carregar pacientes para prontuário:', error);
      toast.error(error?.message || 'Erro ao carregar pacientes.');
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleAddToRecord = (test: ClinicalTest) => {
    if (!user) {
      const note = buildClinicalTestDocumentContent(test);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(note).catch(() => undefined);
      }
      toast.info('Faça login como fisioterapeuta para salvar o documento clínico. A sugestão foi copiada.');
      return;
    }

    if (profile?.tipo_usuario !== 'fisioterapeuta') {
      const note = buildClinicalTestDocumentContent(test);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(note).catch(() => undefined);
      }
      toast.info('Salvar como documento clínico está disponível para fisioterapeutas. A sugestão foi copiada.');
      return;
    }

    setPendingRecordTest(test);
    setRecordModalOpen(true);
    setPatientSearch('');
    setClinicalResult('');
    setClinicalObservation('');

    if (!patientsLoaded) {
      loadPatientsForRecord();
    }
  };

  const handleCloseRecordModal = () => {
    if (savingRecord) return;
    setRecordModalOpen(false);
    setPendingRecordTest(null);
    setPatientSearch('');
    setClinicalResult('');
    setClinicalObservation('');
  };

  const handleSaveClinicalTestToRecord = async () => {
    if (!pendingRecordTest) return;
    if (!user?.id) {
      toast.error('Faça login novamente para salvar o documento clínico.');
      return;
    }
    if (!selectedPatientId) {
      toast.error('Escolha um paciente para atribuir esta sugestão.');
      return;
    }
    if (!clinicalResult) {
      toast.error('Marque se o teste foi positivo, negativo ou inconclusivo.');
      return;
    }

    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    const content = buildClinicalTestDocumentContent(pendingRecordTest, selectedPatient, clinicalResult, clinicalObservation);
    const now = new Date().toISOString();
    const patientName = getPatientName(selectedPatient);
    const patientEmail = selectedPatient?.email ? String(selectedPatient.email).trim().toLowerCase() : null;

    setSavingRecord(true);
    try {
      const documentPayload = {
        physio_id: user.id,
        physio_name: profile?.nome_completo || 'Fisioterapeuta',
        paciente_id: selectedPatientId,
        patient_name: patientName,
        patient_email: patientEmail,
        type: 'Teste clínico',
        document_name: pendingRecordTest.name,
        document_category: 'teste_clinico',
        content,
        visible_to_patient: true,
        acceptance_required: false,
        criado_em: now,
        metadata: {
          source: 'clinical_tests_hub',
          test_id: pendingRecordTest.id,
          test_name: pendingRecordTest.name,
          region: pendingRecordTest.region,
          category: pendingRecordTest.category,
          level: pendingRecordTest.level,
          clinical_result: clinicalResult,
          clinical_result_label: getClinicalResultLabel(clinicalResult),
          clinical_observation: clinicalObservation.trim() || null,
          source_provider: pendingRecordTest.source_provider || null,
          source_url: pendingRecordTest.source_url || null,
          image_url: pendingRecordTest.image_url || null,
          video_url: pendingRecordTest.video_url || null,
          video_provider: pendingRecordTest.video_provider || null,
          video_transcript_pt: getClinicalVideoTranscript(pendingRecordTest) || null,
          video_subtitle_status: pendingRecordTest.video_subtitle_status || null,
        },
      };

      let { error } = await supabase.from('documentos_gerados').insert(documentPayload);

      if (error) {
        console.warn('[ClinicalTestsHub] Salvamento completo em documentos_gerados falhou, tentando compatibilidade:', error);
        const {
          paciente_id,
          visible_to_patient,
          acceptance_required,
          document_category,
          document_name,
          metadata,
          ...legacyPayload
        } = documentPayload;

        const fallback = await supabase.from('documentos_gerados').insert(legacyPayload);
        error = fallback.error;
      }

      if (error) throw error;

      toast.success(`${pendingRecordTest.name} salvo como documento clínico de ${patientName}.`);
      setRecordModalOpen(false);
      setPendingRecordTest(null);
      setPatientSearch('');
      setClinicalResult('');
      setClinicalObservation('');
    } catch (error: any) {
      console.error('Erro ao salvar teste clínico como documento:', error);
      toast.error(error?.message || 'Erro ao salvar documento clínico.');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <>
    <main
      className="clinical-tests-hub min-h-screen w-full min-w-0 overflow-x-hidden bg-[#f8fbff] px-3 pb-24 pt-6 text-slate-950 transition-colors duration-300 dark:bg-[#050b1f] dark:text-white sm:px-6 lg:px-8"
      style={{ maxWidth: '100vw', boxSizing: 'border-box' }}
    >
      <div className="mx-auto w-full min-w-0 space-y-6 overflow-x-hidden lg:max-w-7xl" style={{ maxWidth: '100%' }}>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-violet-200/70 bg-white p-4 shadow-2xl shadow-blue-200/40 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-blue-950/30 sm:rounded-[2rem] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.20),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_30%)]" />
          <div className="relative grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="min-w-0 space-y-5">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200 sm:px-4 sm:text-[10px]" style={safeWrapStyle}>
                <Sparkles className="shrink-0" size={14} /> Premium Clinical Intelligence
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl" style={safeWrapStyle}>
                  Clinical Tests <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Hub</span>
                </h1>
                <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg" style={safeWrapStyle}>
                  Biblioteca premium para consulta rápida de testes ortopédicos, funcionais, neurofuncionais e cardiorrespiratórios dentro da rotina do fisioterapeuta.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                {stats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-w-0 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                      <Icon className="mb-3 text-blue-600 dark:text-blue-300" size={22} />
                      <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400" style={safeWrapStyle}>{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-600 p-1 shadow-2xl shadow-violet-300/40 dark:border-white/10 dark:shadow-violet-950/40">
                <div className="rounded-[1.5rem] bg-white/95 p-4 dark:bg-slate-950/90 sm:p-5">
                  <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100 drop-shadow-sm dark:text-violet-300" style={safeWrapStyle}>Mapa clínico</p>
                      <h2 className="text-xl font-black text-white drop-shadow-sm dark:text-white sm:text-2xl" style={safeWrapStyle}>Regiões prioritárias</h2>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <Stethoscope size={24} />
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-3">
                    {availableCategories.slice(1, 7).map((category, index) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          'min-w-0 rounded-2xl border p-3 text-left transition-all sm:p-4',
                          activeCategory === category
                            ? 'border-violet-400 bg-violet-100 text-violet-900 shadow-lg shadow-violet-200/60 dark:border-violet-300/40 dark:bg-violet-500/20 dark:text-white dark:shadow-none'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
                        )}
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                          <span className="text-sm font-black text-blue-600 dark:text-blue-200">{index + 1}</span>
                        </div>
                        <p className="text-sm font-black" style={safeWrapStyle}>{category}</p>
                        <p className="mt-1 text-[10px] font-semibold opacity-70" style={safeWrapStyle}>Ver testes</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-6 overflow-x-hidden lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 space-y-4 overflow-x-hidden">
            <div className="w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none sm:rounded-[2rem]">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <Search className="shrink-0 text-slate-400" size={20} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar teste, região ou objetivo..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="mt-4 flex max-w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
                <Filter className="shrink-0 text-slate-400" size={16} />
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                      activeCategory === category
                        ? 'bg-slate-950 text-white shadow-lg shadow-slate-300/50 dark:bg-white dark:text-slate-950 dark:shadow-none'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {testsLoading && (
                <div className="clinical-tests-loading-note mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                  <Loader2 className="animate-spin" size={16} />
                  Atualizando testes publicados pelo Admin...
                </div>
              )}
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-3 overflow-x-hidden">
              {filteredTests.length === 0 && (
                <div className="clinical-tests-empty-state rounded-[1.75rem] border border-dashed border-slate-300 bg-white/85 p-6 text-center shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
                  <Search className="mx-auto mb-3 text-slate-400" size={34} />
                  <p className="text-base font-black text-slate-950 dark:text-white">Nenhum teste encontrado</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Revise os filtros ou publique novos testes pelo Admin.</p>
                </div>
              )}
              {filteredTests.map((test) => {
                const Icon = test.icon;
                const isActive = selectedTest?.id === test.id;
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => handleSelectTest(test)}
                    className={cn(
                      'clinical-test-card group block w-full min-w-0 overflow-hidden rounded-[1.5rem] border p-3 text-left transition-all sm:rounded-[1.75rem] sm:p-4',
                      isActive
                        ? 'clinical-test-card-active border-blue-300 bg-white shadow-2xl shadow-blue-200/60 dark:border-blue-300/30 dark:bg-white/10 dark:shadow-blue-950/20'
                        : 'border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 hover:border-violet-300 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none dark:hover:bg-white/5',
                    )}
                  >
                    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                      {shouldDisplayClinicalVideo(test) ? (
                        <div className="clinical-test-video-thumb relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-cyan-200 bg-slate-950 shadow-lg ring-1 ring-cyan-100 transition group-hover:scale-[1.03] dark:border-cyan-300/20 dark:bg-slate-950 dark:ring-white/10">
                          {test.video_thumbnail_url || test.image_url ? (
                            <img
                              src={test.video_thumbnail_url || test.image_url || ''}
                              alt={`Prévia em vídeo - ${test.name}`}
                              className="h-full w-full object-cover opacity-85"
                              loading="lazy"
                            />
                          ) : (
                            <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br text-white', test.gradient)}>
                              <Video size={22} />
                            </div>
                          )}
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 text-white backdrop-blur-[1px]">
                            <PlayCircle size={24} className="drop-shadow-lg" />
                          </span>
                        </div>
                      ) : test.image_url ? (
                        <div
                          className="clinical-test-thumb-preview relative h-14 w-14 shrink-0 cursor-zoom-in overflow-hidden rounded-2xl border border-white/80 bg-slate-100 shadow-lg ring-1 ring-slate-200/70 transition hover:scale-[1.03] hover:ring-blue-300 dark:border-white/10 dark:bg-white/10 dark:ring-white/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            openImagePreview(test);
                          }}
                          title={`Ampliar imagem - ${test.name}`}
                        >
                          <img src={test.image_url} alt={`Prévia - ${test.name}`} className="h-full w-full object-cover" loading="lazy" />
                          <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-lg backdrop-blur">
                            <Eye size={10} />
                          </span>
                        </div>
                      ) : (
                        <div className={cn('clinical-test-gradient-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:h-14 sm:w-14', test.gradient)}>
                          <Icon size={24} />
                        </div>
                      )}
                      <div className="w-full min-w-0 flex-1">
                        <div className="flex w-full min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <h3 className="w-full min-w-0 text-base font-black leading-tight text-slate-950 dark:text-white sm:w-auto sm:flex-1" style={safeWrapStyle}>{test.name}</h3>
                          <div className="flex max-w-full flex-wrap items-center gap-1.5">
                            {test.source_provider && (
                              <span className="clinical-test-imported-pill max-w-full rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-violet-700 dark:border-violet-300/20 dark:bg-violet-500/10 dark:text-violet-200" style={safeWrapStyle}>Admin</span>
                            )}
                            {shouldDisplayClinicalVideo(test) && (
                              <span className="clinical-test-video-pill max-w-full rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-200" style={safeWrapStyle}>Vídeo</span>
                            )}
                            {hasClinicalVideoTranscript(test) && (
                              <span className="clinical-test-subtitle-pill max-w-full rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200" style={safeWrapStyle}>Legenda PT-BR</span>
                            )}
                            <span className="clinical-test-badge max-w-full rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" style={safeWrapStyle}>{test.level}</span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400" style={safeWrapStyle}>{test.region} • {test.category}</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300" style={safeWrapStyle}>{test.objective}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={selectedTestDetailRef} className="w-full min-w-0 scroll-mt-24 overflow-x-hidden lg:sticky lg:top-24 lg:self-start">
            {selectedTest ? (() => {
              const SelectedIcon = selectedTest.icon;
              return (
                <motion.article
                  key={selectedTest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="clinical-test-detail w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-blue-200/50 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-blue-950/30 sm:rounded-[2.2rem]"
                >
                  <div className={cn('clinical-test-hero relative overflow-hidden bg-gradient-to-br p-5 text-white sm:p-6', selectedTest.gradient)}>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_34%)]" />
                    <div className="relative flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="w-full min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75 sm:tracking-[0.24em]" style={safeWrapStyle}>{selectedTest.region} • {selectedTest.category}</p>
                          {selectedTest.source_provider && (
                            <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur">Importado pelo Admin</span>
                          )}
                        </div>
                        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl" style={safeWrapStyle}>{selectedTest.name}</h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-white/85" style={safeWrapStyle}>{selectedTest.objective}</p>
                      </div>
                      <div className="clinical-test-gradient-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur sm:h-14 sm:w-14">
                        <SelectedIcon size={28} />
                      </div>
                    </div>
                  </div>

                  <div className="w-full min-w-0 space-y-4 p-4 sm:p-6">
                    <InfoCard icon={Stethoscope} title="Nome do teste" content={selectedTest.name} tone="blue" />
                    <InfoCard icon={Target} title="Objetivo clínico" content={selectedTest.objective} tone="blue" />
                    <InfoCard icon={Activity} title="Como executar" content={selectedTest.execution} tone="violet" />
                    <InfoCard icon={CheckCircle2} title="Resultado positivo/negativo" content={`Positivo: ${selectedTest.positive} Negativo: ${selectedTest.negative}`} tone="emerald" />
                    <InfoCard icon={Eye} title="Interpretação" content={selectedTest.interpretation} tone="amber" />
                    <InfoCard icon={AlertTriangle} title="Contraindicações/cuidados" content={selectedTest.precautions} tone="rose" />

                    <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-500/10 sm:rounded-[1.75rem]">
                      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', selectedTest.gradient)}>
                          <SelectedIcon size={22} />
                        </div>
                        <div className="w-full min-w-0 flex-1">
                          <h3 className="text-sm font-black uppercase tracking-widest text-cyan-800 dark:text-cyan-200" style={safeWrapStyle}>Vídeo ou imagem demonstrativa</h3>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-cyan-900 dark:text-cyan-50/90" style={safeWrapStyle}>{selectedTest.demo}</p>
                          {shouldDisplayClinicalVideo(selectedTest) ? (() => {
                            const videoEmbedUrl = getClinicalVideoEmbedUrl(selectedTest.video_url, selectedTest.video_provider);
                            const directVideo = isDirectClinicalVideoUrl(selectedTest.video_url);
                            const videoLabel = getClinicalVideoLabel(selectedTest.video_provider);

                            return (
                              <div className="clinical-test-video-panel mt-4 overflow-hidden rounded-[1.35rem] border border-cyan-200 bg-white shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-slate-950/45 dark:shadow-none">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-100 bg-cyan-50/80 px-4 py-3 dark:border-cyan-300/10 dark:bg-cyan-500/10">
                                  <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-100" style={safeWrapStyle}>
                                    <PlayCircle size={15} />
                                    Demonstração em vídeo
                                  </span>
                                  <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-100">
                                    {videoLabel}
                                  </span>
                                </div>

                                {videoEmbedUrl ? (
                                  <div className="clinical-test-video-frame bg-slate-950">
                                    <iframe
                                      src={videoEmbedUrl}
                                      title={`Vídeo demonstrativo - ${selectedTest.name}`}
                                      className="h-full w-full"
                                      loading="lazy"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : directVideo ? (
                                  <video
                                    className="clinical-test-video-native w-full bg-slate-950"
                                    src={selectedTest.video_url || undefined}
                                    poster={selectedTest.video_thumbnail_url || selectedTest.image_url || undefined}
                                    controls
                                    preload="metadata"
                                  >
                                    {selectedTest.video_subtitle_vtt_pt && (
                                      <track
                                        kind="subtitles"
                                        src={getClinicalSubtitleTrackSrc(selectedTest.video_subtitle_vtt_pt)}
                                        srcLang="pt-BR"
                                        label="Português (Brasil)"
                                        default
                                      />
                                    )}
                                  </video>
                                ) : (
                                  <a
                                    href={selectedTest.video_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="clinical-test-video-link group relative block overflow-hidden bg-slate-950 text-white"
                                  >
                                    {selectedTest.video_thumbnail_url || selectedTest.image_url ? (
                                      <img
                                        src={selectedTest.video_thumbnail_url || selectedTest.image_url || ''}
                                        alt={`Capa do vídeo - ${selectedTest.name}`}
                                        className="h-64 w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.02] sm:h-80"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className={cn('flex h-64 w-full items-center justify-center bg-gradient-to-br sm:h-80', selectedTest.gradient)}>
                                        <Video size={48} />
                                      </div>
                                    )}
                                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/35 p-6 text-center backdrop-blur-[1px]">
                                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/18 text-white shadow-2xl ring-1 ring-white/30 backdrop-blur">
                                        <PlayCircle size={38} />
                                      </span>
                                      <span className="text-xs font-black uppercase tracking-[0.22em]">Abrir vídeo demonstrativo</span>
                                    </span>
                                  </a>
                                )}

                                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                                  <a
                                    href={selectedTest.video_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="clinical-test-video-open inline-flex max-w-full items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-200/50 transition hover:bg-cyan-600 dark:shadow-none"
                                    style={safeWrapStyle}
                                  >
                                    Abrir vídeo original
                                    <ExternalLink size={14} />
                                  </a>
                                  {selectedTest.video_source_url && selectedTest.video_source_url !== selectedTest.video_url && (
                                    <a
                                      href={selectedTest.video_source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-800 transition hover:bg-cyan-50 dark:border-cyan-300/20 dark:bg-white/5 dark:text-cyan-100 dark:hover:bg-white/10"
                                      style={safeWrapStyle}
                                    >
                                      Fonte do vídeo
                                      <ArrowRight size={14} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })() : selectedTest.image_url ? (
                            <button
                              type="button"
                              onClick={() => openImagePreview(selectedTest)}
                              className="clinical-test-image-preview-button group relative mt-4 w-full overflow-hidden rounded-2xl border border-cyan-200 bg-white text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/70 focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-cyan-300/30 dark:hover:shadow-blue-950/30"
                              aria-label={`Ampliar imagem demonstrativa - ${selectedTest.name}`}
                            >
                              <img
                                src={selectedTest.image_url}
                                alt={`Imagem demonstrativa - ${selectedTest.name}`}
                                className="h-auto max-h-[420px] w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                                loading="lazy"
                              />
                              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/78 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur">
                                <Eye size={13} />
                                Ampliar
                              </span>
                            </button>
                          ) : (
                            <div className="clinical-test-media-placeholder mt-3 rounded-2xl border border-cyan-200 bg-white/75 p-3 text-xs font-bold text-cyan-800 dark:border-white/10 dark:bg-white/5 dark:text-cyan-100" style={safeWrapStyle}>
                              Espaço preparado para anexar imagem, GIF ou vídeo demonstrativo do teste.
                            </div>
                          )}

                          {shouldDisplayClinicalVideo(selectedTest) && selectedTest.image_url && (
                            <button
                              type="button"
                              onClick={() => openImagePreview(selectedTest)}
                              className="clinical-test-image-preview-button mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-800 shadow-sm transition hover:bg-cyan-50 dark:border-cyan-300/20 dark:bg-white/5 dark:text-cyan-100 dark:hover:bg-white/10"
                              style={safeWrapStyle}
                              aria-label={`Ampliar imagem complementar - ${selectedTest.name}`}
                            >
                              <Eye size={14} />
                              Ver imagem complementar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasClinicalVideoTranscript(selectedTest) && (
                      <div className="clinical-test-transcript-card w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 shadow-sm shadow-emerald-100/70 dark:border-emerald-300/20 dark:bg-none dark:bg-emerald-500/10 dark:shadow-none sm:rounded-[1.75rem]">
                        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                          <FileText className="mt-1 shrink-0 text-emerald-700 dark:text-emerald-200" size={22} />
                          <div className="w-full min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-200" style={safeWrapStyle}>Legenda / transcrição clínica</h3>
                              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:border-emerald-300/20 dark:bg-white/10 dark:text-emerald-200" style={safeWrapStyle}>
                                {getClinicalSubtitleStatusLabel(selectedTest.video_subtitle_status, selectedTest.video_subtitle_reviewed)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200" style={safeWrapStyle}>
                              {getClinicalVideoTranscript(selectedTest)}
                            </p>
                            {selectedTest.video_subtitle_generated_at && (
                              <p className="mt-3 text-[11px] font-bold text-emerald-700 dark:text-emerald-300" style={safeWrapStyle}>
                                Gerada em {new Date(selectedTest.video_subtitle_generated_at).toLocaleDateString('pt-BR')} pelo Admin.
                              </p>
                            )}
                            {selectedTest.video_transcript_original && (
                              <details className="clinical-test-original-transcript mt-3 rounded-2xl border border-emerald-100 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
                                <summary className="cursor-pointer text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-200">Ver observação/transcrição original</summary>
                                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300" style={safeWrapStyle}>
                                  {selectedTest.video_transcript_original}
                                </p>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTest.source_url && (
                      <div className="clinical-test-source-card w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4 shadow-sm shadow-violet-100/70 dark:border-violet-300/20 dark:bg-none dark:bg-violet-500/10 dark:shadow-none sm:rounded-[1.75rem]">
                        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                          <FileText className="mt-1 shrink-0 text-violet-700 dark:text-violet-200" size={22} />
                          <div className="w-full min-w-0 flex-1">
                            <h3 className="text-sm font-black uppercase tracking-widest text-violet-800 dark:text-violet-200" style={safeWrapStyle}>Fonte e revisão</h3>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200" style={safeWrapStyle}>
                              Conteúdo importado pelo Admin como apoio clínico e publicado após revisão. Use sempre com julgamento profissional e correlação com o paciente.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-violet-700 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-200">{selectedTest.source_provider === 'physiopedia' ? 'Physiopedia' : selectedTest.source_provider || 'Fonte externa'}</span>
                              {selectedTest.image_license && (
                                <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:border-blue-300/20 dark:bg-white/10 dark:text-blue-200">Imagem: {selectedTest.image_license}</span>
                              )}
                            </div>
                            <a
                              href={selectedTest.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="clinical-test-source-link mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl bg-violet-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-200/70 transition hover:bg-violet-600 dark:shadow-none"
                              style={safeWrapStyle}
                            >
                              Ver fonte original
                              <ExternalLink size={14} />
                            </a>
                            {(selectedTest.source_attribution || selectedTest.image_attribution) && (
                              <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400" style={safeWrapStyle}>
                                {selectedTest.source_attribution || selectedTest.image_attribution}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10 sm:rounded-[1.75rem]">
                      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                        <BadgeCheck className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300" size={22} />
                        <div className="w-full min-w-0 flex-1">
                          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-200" style={safeWrapStyle}>Sugestão para prontuário</h3>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900 dark:text-emerald-50/90" style={safeWrapStyle}>{selectedTest.recordSuggestion}</p>
                          <button
                            type="button"
                            onClick={() => handleAddToRecord(selectedTest)}
                            className="clinical-test-add-button mt-4 flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-500 dark:shadow-emerald-950/30"
                          >
                            <ClipboardCheck className="shrink-0" size={18} />
                            <span style={safeWrapStyle}>Adicionar ao prontuário</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })() : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-950/60">
                <Stethoscope className="mx-auto mb-4 text-slate-400" size={42} />
                <h3 className="text-xl font-black text-slate-950 dark:text-white">Selecione um teste</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Escolha um teste na lista para ver detalhes clínicos.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>

    {imagePreview && (
      <div
        className="clinical-test-image-modal-layer fixed inset-0 flex items-center justify-center px-3 py-5 sm:px-6"
        style={{ zIndex: 2147483647 }}
      >
        <div
          className="clinical-test-image-modal-backdrop absolute inset-0"
          onClick={closeImagePreview}
        />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="clinical-test-image-modal-card relative flex max-h-[calc(100dvh_-_2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-slate-950 dark:text-white sm:rounded-[2.4rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 sm:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300" style={safeWrapStyle}>Imagem demonstrativa</p>
              <h3 className="mt-1 text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-2xl" style={safeWrapStyle}>{imagePreview.title}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400" style={safeWrapStyle}>Clique fora da imagem ou pressione ESC para fechar.</p>
            </div>
            <button
              type="button"
              onClick={closeImagePreview}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              aria-label="Fechar imagem ampliada"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-slate-100/80 p-3 dark:bg-slate-950/80 sm:p-5">
            <img
              src={imagePreview.src}
              alt={imagePreview.alt}
              className="clinical-test-image-modal-img mx-auto max-h-[calc(100dvh_-_12rem)] w-auto max-w-full rounded-2xl object-contain shadow-2xl shadow-slate-950/20"
            />
          </div>

          {(imagePreview.sourceUrl || imagePreview.attribution) && (
            <div className="border-t border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-950/95 sm:p-5">
              {imagePreview.attribution && (
                <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400" style={safeWrapStyle}>{imagePreview.attribution}</p>
              )}
              {imagePreview.sourceUrl && (
                <a
                  href={imagePreview.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl bg-blue-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200/60 transition hover:bg-blue-600 dark:shadow-none"
                  style={safeWrapStyle}
                >
                  Ver fonte da imagem
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </motion.div>
      </div>
    )}

    {recordModalOpen && (
      <div
        className="clinical-record-modal-layer fixed inset-0 flex items-start justify-center overflow-hidden px-3 pb-4 pt-[calc(env(safe-area-inset-top)_+_5.35rem)] sm:items-center sm:p-6"
        style={{ zIndex: 2147483647 }}
      >
        <div
          className="clinical-record-modal-backdrop absolute inset-0 bg-slate-950/45 backdrop-blur-sm dark:bg-slate-950/70"
          onClick={handleCloseRecordModal}
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="clinical-record-modal-card relative max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_6.35rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-violet-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-black/40 dark:ring-0 sm:max-h-[92vh]"
        >
          <div className="clinical-record-modal-decor pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)]" />
          <div className="relative p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="clinical-record-eyebrow text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300" style={safeWrapStyle}>Adicionar aos documentos</p>
                <h3 className="clinical-record-title mt-1 text-2xl font-black leading-tight text-slate-950 dark:text-white" style={safeWrapStyle}>
                  Escolha o paciente
                </h3>
                <p className="clinical-record-description mt-2 text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-300" style={safeWrapStyle}>
                  {pendingRecordTest?.name || 'Teste clínico'} será salvo como documento clínico do paciente selecionado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRecordModal}
                className="clinical-record-close flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {patients.length > 5 && (
              <div className="clinical-record-search mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <Search className="shrink-0 text-slate-400" size={18} />
                <input
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Buscar paciente..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="clinical-record-patients-list max-h-[42vh] space-y-3 overflow-y-auto pr-1">
              {patientsLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-8 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <Loader2 className="animate-spin text-blue-600 dark:text-blue-300" size={22} />
                  <span className="text-sm font-black">Carregando pacientes...</span>
                </div>
              ) : patients.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center dark:border-white/10 dark:bg-white/5">
                  <UserRound className="mx-auto mb-3 text-slate-400" size={38} />
                  <p className="text-base font-black text-slate-950 dark:text-white">Nenhum paciente encontrado</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400" style={safeWrapStyle}>Cadastre ou vincule um paciente antes de atribuir a sugestão ao prontuário.</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  Nenhum paciente corresponde à busca.
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const isSelected = selectedPatientId === patient.id;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={cn(
                        'clinical-record-patient-card flex w-full min-w-0 items-center gap-3 rounded-3xl border p-4 text-left transition-all',
                        isSelected
                          ? 'clinical-record-patient-card-selected border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100/70 dark:border-emerald-300/40 dark:bg-emerald-500/15 dark:shadow-none'
                          : 'border-slate-200 bg-white/80 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
                      )}
                    >
                      <div className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-black',
                        isSelected
                          ? 'border-emerald-300 bg-emerald-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-blue-200',
                      )}>
                        {getPatientName(patient).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-950 dark:text-white" style={safeWrapStyle}>{getPatientName(patient)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400" style={safeWrapStyle}>{getPatientSubtitle(patient)}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="shrink-0 text-emerald-600 dark:text-emerald-300" size={22} />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="clinical-record-result-section mt-5 rounded-3xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none">
              <div className="mb-3 flex min-w-0 items-start gap-3">
                <ClipboardCheck className="clinical-record-result-icon mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={20} />
                <div className="min-w-0">
                  <p className="clinical-record-result-title text-sm font-black text-slate-950 dark:text-white" style={safeWrapStyle}>Resultado do teste</p>
                  <p className="clinical-record-result-description mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400" style={safeWrapStyle}>
                    Marque o resultado para constar no documento clínico do paciente.
                  </p>
                </div>
              </div>

              <div className="clinical-record-result-options grid gap-2 sm:grid-cols-3">
                {clinicalResultOptions.map((option) => {
                  const isSelected = clinicalResult === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setClinicalResult(option.value)}
                      className={cn(
                        'clinical-record-result-option rounded-2xl border px-3 py-3 text-left transition-all',
                        isSelected
                          ? 'clinical-record-result-option-selected border-emerald-500 bg-emerald-100 text-slate-950 shadow-lg shadow-emerald-100/80 dark:border-emerald-300/40 dark:bg-emerald-500/15 dark:text-white dark:shadow-none'
                          : 'border-slate-200 bg-white text-slate-950 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:bg-white/10',
                      )}
                    >
                      <span className={cn('flex items-center justify-between gap-2 text-sm font-black', isSelected ? 'text-slate-950 dark:text-white' : 'text-slate-950 dark:text-slate-200')}>
                        {option.label}
                        {isSelected && <CheckCircle2 className="shrink-0 text-emerald-600 dark:text-emerald-300" size={18} />}
                      </span>
                      <span className={cn('mt-1 block text-[11px] font-semibold leading-relaxed', isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300')} style={safeWrapStyle}>{option.description}</span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block">
                <span className="clinical-record-observation-label text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-400">Observação clínica opcional</span>
                <textarea
                  value={clinicalObservation}
                  onChange={(event) => setClinicalObservation(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex.: dor no ombro direito durante a elevação passiva, intensidade 6/10."
                  className="clinical-record-observation-input mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-500/20"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCloseRecordModal}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveClinicalTestToRecord}
                disabled={savingRecord || patientsLoading || !selectedPatientId || !clinicalResult || patients.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-emerald-950/30"
              >
                {savingRecord ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />}
                Salvar documento clínico
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
    </>
  );
}

function InfoCard({ icon: Icon, title, content, tone }: { icon: typeof Activity; title: string; content: string; tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200',
    violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200',
  }[tone];

  return (
    <div className={cn('clinical-test-info-box w-full min-w-0 overflow-hidden rounded-[1.5rem] border p-4', toneClass)}>
      <div className="mb-2 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Icon className="shrink-0" size={18} />
        <h3 className="min-w-0 text-[11px] font-black uppercase tracking-widest" style={safeWrapStyle}>{title}</h3>
      </div>
      <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-white/85" style={safeWrapStyle}>{content}</p>
    </div>
  );
}
