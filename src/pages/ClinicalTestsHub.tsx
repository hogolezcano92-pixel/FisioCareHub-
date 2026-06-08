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
  Filter,
  HeartPulse,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

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
  recordSuggestion: string;
  level: 'Essencial' | 'Intermediário' | 'Avançado';
  gradient: string;
  icon: typeof Activity;
}

const categories = [
  'Todos',
  'Ombro',
  'Joelho',
  'Coluna',
  'Tornozelo',
  'Quadril',
  'Neurofuncional',
  'Funcional',
  'Cardiorrespiratório',
];

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

export default function ClinicalTestsHub() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<ClinicalTest[]>(clinicalTests);
  const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(clinicalTests[0]);
  const selectedTestDetailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClinicalTestMedia = async () => {
      try {
        const { data, error } = await supabase
          .from('clinical_tests')
          .select('id, image_url, video_url, demo, is_active');

        if (error) {
          console.warn('Clinical tests media not loaded:', error.message);
          return;
        }

        if (!isMounted || !Array.isArray(data) || data.length === 0) return;

        const mediaById = new Map(
          data
            .filter((item: any) => item?.is_active !== false)
            .map((item: any) => [String(item.id), item])
        );

        const nextTests = clinicalTests.map((test) => {
          const media = mediaById.get(test.id) as any;
          if (!media) return test;

          return {
            ...test,
            demo: String(media.demo || test.demo),
            image_url: media.image_url || test.image_url || null,
            video_url: media.video_url || test.video_url || null,
          };
        });

        setTests(nextTests);
        setSelectedTest((current) => {
          if (!current) return nextTests[0] || null;
          return nextTests.find((test) => test.id === current.id) || current;
        });
      } catch (error) {
        console.warn('Clinical tests media fetch failed:', error);
      }
    };

    loadClinicalTestMedia();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tests.filter((test) => {
      const matchesCategory = activeCategory === 'Todos' || test.region === activeCategory || test.category === activeCategory;
      const matchesSearch = !normalizedQuery
        || test.name.toLowerCase().includes(normalizedQuery)
        || test.region.toLowerCase().includes(normalizedQuery)
        || test.category.toLowerCase().includes(normalizedQuery)
        || test.objective.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query, tests]);

  const handleSelectTest = (test: ClinicalTest) => {
    setSelectedTest(test);

    window.requestAnimationFrame(() => {
      selectedTestDetailRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleAddToRecord = (test: ClinicalTest) => {
    const note = `${test.name}: ${test.recordSuggestion} Resultado positivo: ${test.positive} Resultado negativo: ${test.negative}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(note).catch(() => undefined);
    }

    toast.success('Sugestão copiada para adicionar ao prontuário.');
  };

  return (
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
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300" style={safeWrapStyle}>Mapa clínico</p>
                      <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl" style={safeWrapStyle}>Regiões prioritárias</h2>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <Stethoscope size={24} />
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-3">
                    {categories.slice(1, 7).map((category, index) => (
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
                {categories.map((category) => (
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
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-3 overflow-x-hidden">
              {filteredTests.map((test) => {
                const Icon = test.icon;
                const isActive = selectedTest?.id === test.id;
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => handleSelectTest(test)}
                    className={cn(
                      'group block w-full min-w-0 overflow-hidden rounded-[1.5rem] border p-3 text-left transition-all sm:rounded-[1.75rem] sm:p-4',
                      isActive
                        ? 'border-blue-300 bg-white shadow-2xl shadow-blue-200/60 dark:border-blue-300/30 dark:bg-white/10 dark:shadow-blue-950/20'
                        : 'border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 hover:border-violet-300 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none dark:hover:bg-white/5',
                    )}
                  >
                    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:h-14 sm:w-14', test.gradient)}>
                        <Icon size={24} />
                      </div>
                      <div className="w-full min-w-0 flex-1">
                        <div className="flex w-full min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <h3 className="w-full min-w-0 text-base font-black leading-tight text-slate-950 dark:text-white sm:w-auto sm:flex-1" style={safeWrapStyle}>{test.name}</h3>
                          <span className="max-w-full rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" style={safeWrapStyle}>{test.level}</span>
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
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75 sm:tracking-[0.24em]" style={safeWrapStyle}>{selectedTest.region} • {selectedTest.category}</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl" style={safeWrapStyle}>{selectedTest.name}</h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-white/85" style={safeWrapStyle}>{selectedTest.objective}</p>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur sm:h-14 sm:w-14">
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
                          {selectedTest.image_url ? (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                              <img
                                src={selectedTest.image_url}
                                alt={`Imagem demonstrativa - ${selectedTest.name}`}
                                className="h-auto max-h-[420px] w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="clinical-test-media-placeholder mt-3 rounded-2xl border border-cyan-200 bg-white/75 p-3 text-xs font-bold text-cyan-800 dark:border-white/10 dark:bg-white/5 dark:text-cyan-100" style={safeWrapStyle}>
                              Espaço preparado para anexar imagem, GIF ou vídeo demonstrativo do teste.
                            </div>
                          )}
                          {selectedTest.video_url && (
                            <a
                              href={selectedTest.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-200/50 transition hover:bg-cyan-600 dark:shadow-none"
                            >
                              Abrir vídeo demonstrativo
                              <ArrowRight size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

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
