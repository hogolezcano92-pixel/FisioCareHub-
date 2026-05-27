import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Newspaper,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { resolveClinicalImage, resolveClinicalImageLabel } from '../../lib/clinicalImageResolver';

type ClinicalUpdate = {
  id: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  category?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  image_key?: string | null;
  is_featured?: boolean | null;
};

const FALLBACK_UPDATES: ClinicalUpdate[] = [
  {
    id: 'fallback-rehab',
    title: 'Atualizações clínicas automáticas em preparação',
    summary: 'Assim que a rotina por API rodar, artigos recentes de reabilitação e fisioterapia aparecerão aqui automaticamente.',
    source: 'FisioCareHub',
    source_type: 'Sistema',
    category: 'Reabilitação',
    image_url: '/clinical-updates/medicina-geral.jpg',
    is_featured: true,
  },
  {
    id: 'fallback-science',
    title: 'Conteúdos com foco em evidência científica',
    summary: 'O carrossel foi preparado para receber artigos do PubMed e notícias de saúde, com links para a fonte original.',
    source: 'FisioCareHub',
    source_type: 'Sistema',
    category: 'Evidência',
    image_url: '/clinical-updates/medicina-geral.jpg',
  },
];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  pubmed: 'Artigo científico',
  gnews: 'Notícia',
  europepmc: 'Artigo Europe PMC',
  crossref: 'Artigo científico',
  scielo: 'Artigo SciELO',
  manual: 'Conteúdo FisioCareHub',
  sistema: 'Sistema',
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Atualização recente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Atualização recente';

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

const imageInputFromUpdate = (item: ClinicalUpdate) => ({
  title: item.title,
  summary: item.summary,
  category: item.category,
  sourceType: item.source_type,
  imageUrl: item.image_url,
  imageKey: item.image_key,
});

export default function ClinicalUpdatesCarousel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [updates, setUpdates] = useState<ClinicalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [autoPlay, setAutoPlay] = useState(true);

  const loadUpdates = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clinical_updates')
        .select('id, title, summary, source, source_url, source_type, category, published_at, created_at, image_url, image_key, is_featured')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

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

  const categories = useMemo(() => {
    const values = updates.map((item) => resolveClinicalImageLabel(imageInputFromUpdate(item)));
    return ['Todos', ...Array.from(new Set(values)).slice(0, 7)];
  }, [updates]);

  const visibleUpdates = useMemo(() => {
    if (selectedCategory === 'Todos') return updates;
    return updates.filter((item) => resolveClinicalImageLabel(imageInputFromUpdate(item)) === selectedCategory);
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

  const openUpdate = (item: ClinicalUpdate) => {
    setAutoPlay(false);
    navigate(`/clinical-updates/${item.id}`);
  };

  const openSource = (item: ClinicalUpdate) => {
    const url = String(item.source_url || '').trim();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
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
              onClick={() => openUpdate(featuredUpdate)}
              className="group w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-white/[0.075]"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-800">
                  <img
                    src={resolveClinicalImage(imageInputFromUpdate(featuredUpdate))}
                    alt="Atualização clínica em destaque"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                      {resolveClinicalImageLabel(imageInputFromUpdate(featuredUpdate))}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {formatDate(featuredUpdate.published_at || featuredUpdate.created_at)}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-black leading-5 text-white">{featuredUpdate.title}</h3>
                  <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-400">{featuredUpdate.summary}</p>
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
              {visibleUpdates.map((item, index) => {
                const imageInput = imageInputFromUpdate(item);
                return (
                  <article
                    key={item.id}
                    onClick={() => {
                      setActiveIndex(index);
                      openUpdate(item);
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
                        src={resolveClinicalImage(imageInput)}
                        alt="Atualização clínica"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                        {resolveClinicalImageLabel(imageInput)}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>{normalizeType(item.source_type)}</span>
                          <span>•</span>
                          <span>{formatDate(item.published_at || item.created_at)}</span>
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
                            openUpdate(item);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/20 transition-all hover:scale-[1.02]"
                        >
                          Ler aqui <BookOpenCheck size={14} />
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
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
