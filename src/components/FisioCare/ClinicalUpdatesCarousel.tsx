import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Lightbulb,
  Newspaper,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type ClinicalUpdate = {
  id: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  category?: string | null;
  published_at?: string | null;
  image_url?: string | null;
  is_featured?: boolean | null;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Reabilitação': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
  'Exercício terapêutico': 'https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&q=80&w=1200',
  'Ortopedia': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200',
  'Neurológica': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80&w=1200',
  'Cardiorrespiratória': 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&q=80&w=1200',
  'Esportiva': 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=1200',
  'Geriatria': 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=1200',
  'Fisioterapia': 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&q=80&w=1200',
  'Evidência': 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&q=80&w=1200',
  'Geral': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
};

const DEFAULT_IMAGE = CATEGORY_IMAGES.Geral;

const FALLBACK_UPDATES: ClinicalUpdate[] = [
  {
    id: 'fallback-rehab',
    title: 'Atualizações clínicas automáticas em preparação',
    summary: 'Assim que a rotina por API rodar, artigos recentes de reabilitação e fisioterapia aparecerão aqui automaticamente.',
    source: 'FisioCareHub',
    source_type: 'Sistema',
    category: 'Reabilitação',
    image_url: CATEGORY_IMAGES.Reabilitação,
    is_featured: true,
  },
  {
    id: 'fallback-science',
    title: 'Conteúdos com foco em evidência científica',
    summary: 'O carrossel foi preparado para receber artigos do PubMed e notícias de saúde, com links para a fonte original.',
    source: 'FisioCareHub',
    source_type: 'Sistema',
    category: 'Evidência',
    image_url: CATEGORY_IMAGES.Evidência,
  },
];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  pubmed: 'Artigo científico',
  gnews: 'Notícia',
  manual: 'Conteúdo FisioCareHub',
  sistema: 'Sistema',
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Atualização recente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Atualização recente';

  // Algumas bases científicas podem retornar data futura/ahead of print.
  // Para não mostrar uma data errada no app, tratamos como atualização recente.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() > tomorrow.getTime()) return 'Atualização recente';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getReadingTime = (text?: string | null) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min`;
};

const normalizeType = (value?: string | null) => {
  const key = String(value || '').toLowerCase();
  return SOURCE_TYPE_LABELS[key] || value || 'Atualização';
};

const inferCategoryFromText = (item: ClinicalUpdate) => {
  const category = String(item.category || '').trim();
  if (category && CATEGORY_IMAGES[category]) return category;

  const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();

  if (/(lombar|joelho|ombro|ortop|musculoesquel|dor|artrose|coluna|quadril|tornozelo)/i.test(text)) return 'Ortopedia';
  if (/(avc|stroke|neurol|parkinson|cerebral|equilíbrio|marcha)/i.test(text)) return 'Neurológica';
  if (/(cardio|respirat|pulmonar|ventila|dpoc|oxig|covid)/i.test(text)) return 'Cardiorrespiratória';
  if (/(esport|atleta|corrida|lesão esportiva|performance)/i.test(text)) return 'Esportiva';
  if (/(idoso|geriatr|envelhec|queda|fragilidade)/i.test(text)) return 'Geriatria';
  if (/(exercício|exercise|fortalecimento|mobilidade|terapêutico)/i.test(text)) return 'Exercício terapêutico';
  if (/(evidência|estudo|científico|pubmed|pesquisa)/i.test(text)) return 'Evidência';

  return category || 'Geral';
};

const getClinicalImage = (item: ClinicalUpdate) => {
  const category = inferCategoryFromText(item);
  const isManualContent = ['manual', 'sistema'].includes(String(item.source_type || '').toLowerCase());

  if (!isManualContent) return CATEGORY_IMAGES[category] || DEFAULT_IMAGE;

  return item.image_url || CATEGORY_IMAGES[category] || DEFAULT_IMAGE;
};

const getClinicalBullets = (item: ClinicalUpdate) => {
  const summary = String(item.summary || '').trim();
  const category = inferCategoryFromText(item);
  const sourceType = normalizeType(item.source_type);

  return [
    `${sourceType} relacionado à área de ${category}.`,
    summary || 'Resumo clínico indisponível no momento. Consulte a fonte original para detalhes.',
    'Use este conteúdo como atualização profissional, não como protocolo individual para todos os pacientes.',
  ];
};

const buildPracticalApplication = (item: ClinicalUpdate) => {
  const category = inferCategoryFromText(item);

  const applications: Record<string, string> = {
    'Ortopedia': 'Pode ajudar o fisioterapeuta a refletir sobre avaliação funcional, progressão de exercícios, dor, mobilidade e retorno às atividades.',
    'Neurológica': 'Pode apoiar raciocínio sobre marcha, equilíbrio, funcionalidade, neuroplasticidade e acompanhamento progressivo do paciente.',
    'Cardiorrespiratória': 'Pode contribuir para atualização sobre tolerância ao esforço, segurança, monitoramento e reabilitação cardiorrespiratória.',
    'Esportiva': 'Pode ser útil para pensar em prevenção, retorno gradual ao esporte, controle de carga e desempenho funcional.',
    'Geriatria': 'Pode apoiar decisões sobre prevenção de quedas, força, autonomia, mobilidade e funcionalidade em idosos.',
    'Exercício terapêutico': 'Pode orientar ideias de prescrição, progressão, aderência e segurança no exercício terapêutico.',
    'Reabilitação': 'Pode ajudar no planejamento de cuidado, metas funcionais e acompanhamento da evolução do paciente.',
  };

  return applications[category] || 'Pode servir como inspiração para atualização clínica, educação em saúde e tomada de decisão baseada em evidências.';
};

export default function ClinicalUpdatesCarousel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [updates, setUpdates] = useState<ClinicalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [autoPlay, setAutoPlay] = useState(true);
  const [selectedUpdate, setSelectedUpdate] = useState<ClinicalUpdate | null>(null);

  const loadUpdates = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clinical_updates')
        .select('id, title, summary, source, source_url, source_type, category, published_at, image_url, is_featured')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(12);

      if (error) {
        console.info('[ClinicalUpdatesCarousel] Tabela ainda não disponível ou sem permissão:', error.message);
        setUpdates(FALLBACK_UPDATES);
        return;
      }

      setUpdates(data?.length ? (data as ClinicalUpdate[]) : FALLBACK_UPDATES);
    } catch (error) {
      console.info('[ClinicalUpdatesCarousel] Falha ao carregar atualizações clínicas:', error);
      setUpdates(FALLBACK_UPDATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  useEffect(() => {
    if (!selectedUpdate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedUpdate(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedUpdate]);

  const categories = useMemo(() => {
    const values = updates.map((item) => inferCategoryFromText(item));
    return ['Todos', ...Array.from(new Set(values)).slice(0, 7)];
  }, [updates]);

  const visibleUpdates = useMemo(() => {
    if (selectedCategory === 'Todos') return updates;
    return updates.filter((item) => inferCategoryFromText(item) === selectedCategory);
  }, [selectedCategory, updates]);

  const featuredUpdate = visibleUpdates[activeIndex] || visibleUpdates[0];

  const scrollToUpdate = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container || visibleUpdates.length === 0) return;

    const safeIndex = ((index % visibleUpdates.length) + visibleUpdates.length) % visibleUpdates.length;
    const target = container.children.item(safeIndex) as HTMLElement | null;

    if (target) {
      const centeredLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
      container.scrollTo({ left: Math.max(centeredLeft, 0), behavior: 'smooth' });
    }

    setActiveIndex(safeIndex);
  }, [visibleUpdates.length]);

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [selectedCategory, updates.length]);

  useEffect(() => {
    if (!autoPlay || loading || visibleUpdates.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = currentIndex + 1 >= visibleUpdates.length ? 0 : currentIndex + 1;
        const container = scrollRef.current;
        const target = container?.children.item(nextIndex) as HTMLElement | null;

        if (container && target) {
          const centeredLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
          container.scrollTo({ left: Math.max(centeredLeft, 0), behavior: 'smooth' });
        }

        return nextIndex;
      });
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [autoPlay, loading, visibleUpdates.length]);

  const openSource = (item: ClinicalUpdate) => {
    const url = String(item.source_url || '').trim();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openReader = (item: ClinicalUpdate) => {
    setAutoPlay(false);
    navigate(`/clinical-updates/${item.id}`);
  };

  return (
    <>
      <section className={cn('relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-slate-900/60 shadow-2xl shadow-blue-950/20 backdrop-blur-xl', className)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,0.24),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.20),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_34%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent" />

        <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:grid-cols-[0.95fr_1.25fr] lg:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                <Sparkles size={13} /> Atualizações Clínicas
              </div>
              <button
                type="button"
                onClick={loadUpdates}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                aria-label="Atualizar conteúdos clínicos"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Evidências, notícias e tendências para sua prática
              </h2>
              <p className="max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Conteúdos buscados por API e organizados para o fisioterapeuta acompanhar novidades sem sair do FisioCareHub.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2">
              <MetricPill icon={<BookOpenCheck size={16} />} label="Artigos" value="PubMed" />
              <MetricPill icon={<Newspaper size={16} />} label="Notícias" value="API" />
              <MetricPill icon={<Stethoscope size={16} />} label="Foco" value="Fisio" />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                    selectedCategory === category
                      ? 'border-sky-300/40 bg-sky-400/15 text-sky-100 shadow-lg shadow-sky-950/20'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {featuredUpdate ? (
              <button
                type="button"
                onClick={() => openReader(featuredUpdate)}
                className="group w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-white/[0.075]"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-800">
                    <img
                      src={getClinicalImage(featuredUpdate)}
                      alt="Atualização clínica em destaque"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
                      <span>{normalizeType(featuredUpdate.source_type)}</span>
                      <span>•</span>
                      <span>{formatDate(featuredUpdate.published_at)}</span>
                    </div>
                    <h3 className="line-clamp-2 text-base font-black leading-6 text-white">{featuredUpdate.title}</h3>
                    <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-400">
                      {featuredUpdate.summary || 'Resumo indisponível no momento.'}
                    </p>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-500 transition-all group-hover:text-sky-200" />
                </div>
              </button>
            ) : null}
          </div>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <Search size={15} className="text-sky-300" />
                {loading ? 'Buscando atualizações...' : `${visibleUpdates.length} conteúdos disponíveis`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoPlay((value) => !value)}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white flex items-center justify-center"
                  aria-label={autoPlay ? 'Pausar carrossel' : 'Reproduzir carrossel'}
                >
                  {autoPlay ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToUpdate(activeIndex - 1)}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white flex items-center justify-center"
                  aria-label="Ver conteúdo anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToUpdate(activeIndex + 1)}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white flex items-center justify-center"
                  aria-label="Ver próximo conteúdo"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-[350px] min-w-[245px] rounded-[1.75rem] border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div
                ref={scrollRef}
                onMouseEnter={() => setAutoPlay(false)}
                onMouseLeave={() => setAutoPlay(true)}
                onTouchStart={() => setAutoPlay(false)}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 px-[calc((100%-245px)/2)] sm:px-[calc((100%-285px)/2)] lg:px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleUpdates.map((item, index) => (
                  <article
                    key={item.id}
                    onClick={() => {
                      setActiveIndex(index);
                      openReader(item);
                    }}
                    className={cn(
                      'group relative flex h-[350px] w-[245px] shrink-0 snap-center cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border bg-slate-950/70 shadow-xl transition-all duration-300 sm:w-[285px]',
                      activeIndex === index
                        ? 'border-sky-300/50 shadow-sky-950/30'
                        : 'border-white/10 hover:-translate-y-1 hover:border-white/25'
                    )}
                  >
                    <div className="relative h-36 overflow-hidden bg-slate-800">
                      <img
                        src={getClinicalImage(item)}
                        alt="Atualização clínica"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                        {inferCategoryFromText(item)}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>{normalizeType(item.source_type)}</span>
                          <span>•</span>
                          <span>{getReadingTime(item.summary || item.title)}</span>
                        </div>
                        <h3 className="line-clamp-3 text-base font-black leading-6 text-white">{item.title}</h3>
                        <p className="line-clamp-3 text-xs font-semibold leading-5 text-slate-400">{item.summary || 'Resumo indisponível. Acesse a fonte original para ler mais detalhes.'}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openReader(item);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02]"
                        >
                          Ler aqui <FileText size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openSource(item);
                          }}
                          disabled={!item.source_url}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Abrir fonte original"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ClinicalUpdateReader({
  update,
  onClose,
  onOpenSource,
}: {
  update: ClinicalUpdate;
  onClose: () => void;
  onOpenSource: () => void;
}) {
  const bullets = getClinicalBullets(update);
  const image = getClinicalImage(update);

  return (
    <div className="fixed inset-x-0 bottom-0 top-[5.15rem] z-[90] flex items-start justify-center bg-slate-950/95 p-0 backdrop-blur-xl sm:inset-0 sm:items-center sm:bg-slate-950/80 sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Fechar leitura"
        onClick={onClose}
      />

      <article className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.25rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/40 sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="relative h-44 shrink-0 overflow-hidden bg-slate-900 sm:h-56">
          <img src={image} alt="Imagem clínica da atualização" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/10" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-3 sm:left-4 sm:right-4 sm:top-4">
            <div className="inline-flex max-w-[calc(100%-3.25rem)] items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100 backdrop-blur-md sm:text-[10px]">
              <BookOpenCheck size={13} /> <span className="truncate">Ler no FisioCareHub</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-sky-200 sm:mb-3 sm:gap-2 sm:text-[10px] sm:tracking-widest">
              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-1 sm:px-2.5">{normalizeType(update.source_type)}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 sm:px-2.5">{inferCategoryFromText(update)}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 sm:px-2.5">{formatDate(update.published_at)}</span>
            </div>
            <h2 className="line-clamp-2 max-w-3xl text-lg font-black leading-tight text-white sm:line-clamp-3 sm:text-3xl">
              {update.title}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:max-h-[calc(92vh-14rem)] sm:p-7">
          <div className="grid gap-5 pb-20 sm:pb-0 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-5">
              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                  <Sparkles size={17} className="text-sky-300" /> Resumo em português
                </div>
                <p className="text-sm font-semibold leading-7 text-slate-300">
                  {update.summary || 'Resumo indisponível no momento. Use o botão de fonte original para conferir mais detalhes.'}
                </p>
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                  <Lightbulb size={17} className="text-amber-300" /> Pontos principais
                </div>
                <div className="space-y-3">
                  {bullets.map((bullet, index) => (
                    <div key={index} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-xs font-black text-sky-200">
                        {index + 1}
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-300">{bullet}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-400/[0.06] p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-100">
                  <Stethoscope size={17} /> Aplicação prática
                </div>
                <p className="text-sm font-semibold leading-7 text-emerald-50/80">
                  {buildPracticalApplication(update)}
                </p>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Detalhes</p>
                <div className="space-y-3 text-sm font-semibold text-slate-300">
                  <InfoRow icon={<Newspaper size={15} />} label="Fonte" value={update.source || 'Fonte não informada'} />
                  <InfoRow icon={<CalendarDays size={15} />} label="Data" value={formatDate(update.published_at)} />
                  <InfoRow icon={<BookOpenCheck size={15} />} label="Leitura" value={getReadingTime(`${update.title} ${update.summary || ''}`)} />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-amber-300/15 bg-amber-400/[0.06] p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-100">
                  <ShieldCheck size={17} /> Observação clínica
                </div>
                <p className="text-xs font-semibold leading-6 text-amber-50/80">
                  Este conteúdo é um resumo informativo gerado a partir da fonte original. Ele não substitui avaliação, julgamento clínico nem leitura completa do estudo/notícia.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenSource}
                disabled={!update.source_url}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Abrir fonte original <ExternalLink size={16} />
              </button>
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/55 p-3">
      <div className="mt-0.5 text-sky-300">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/50 p-3 text-center ring-1 ring-white/10">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-xs font-black text-white">{value}</p>
    </div>
  );
}
