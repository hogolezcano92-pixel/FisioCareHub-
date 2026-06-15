import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type ClinicalUpdate = {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  source?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  is_published?: boolean | null;
};

const FALLBACK_UPDATES: ClinicalUpdate[] = [
  {
    id: 'fallback-lombalgia',
    title: 'Dor lombar crônica: exercício terapêutico e educação em dor',
    summary: 'Atualização prática para raciocínio clínico, prescrição progressiva e orientação do paciente com lombalgia.',
    category: 'Ortopedia',
    source: 'Artigo científico',
    published_at: new Date().toISOString(),
  },
  {
    id: 'fallback-joelho',
    title: 'Reabilitação do joelho: força, controle motor e retorno gradual',
    summary: 'Pontos de atenção para avaliação, progressão de carga e prevenção de recidivas em lesões de joelho.',
    category: 'Traumato-ortopedia',
    source: 'Artigo científico',
    published_at: new Date().toISOString(),
  },
  {
    id: 'fallback-neuro',
    title: 'Neuroreabilitação: funcionalidade, repetição e metas centradas no paciente',
    summary: 'Resumo clínico sobre treino orientado à tarefa e acompanhamento funcional em pacientes neurológicos.',
    category: 'Neurofuncional',
    source: 'Atualização clínica',
    published_at: new Date().toISOString(),
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatDate = (value?: string | null) => {
  if (!value) return 'Atualização clínica';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Atualização clínica';
  }
};

export default function ClinicalUpdates() {
  const [updates, setUpdates] = useState<ClinicalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    document.title = 'Artigos científicos - FisioCareHub';

    const fetchUpdates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('clinical_updates')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(80);

        if (error) {
          console.info('[ClinicalUpdates] Falha ao carregar artigos científicos:', error.message);
          setUpdates(FALLBACK_UPDATES);
          return;
        }

        setUpdates(data?.length ? (data as ClinicalUpdate[]) : FALLBACK_UPDATES);
      } catch (error) {
        console.info('[ClinicalUpdates] Falha inesperada:', error);
        setUpdates(FALLBACK_UPDATES);
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(updates.map((item) => item.category).filter(Boolean) as string[]));
    return ['Todas', ...unique.slice(0, 10)];
  }, [updates]);

  const filteredUpdates = useMemo(() => {
    const query = normalize(searchTerm.trim());

    return updates.filter((item) => {
      const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
      const searchable = normalize([item.title, item.summary, item.category, item.source].filter(Boolean).join(' '));
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [updates, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-950 pb-32 text-white dark:bg-slate-950 md:pb-16 mobile-bottom-content-safe">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.32),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(14,165,233,0.24),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      </div>

      <style>{`
        html:not(.dark) .fch-clinical-updates-page,
        body.light .fch-clinical-updates-page,
        html.light .fch-clinical-updates-page,
        :root[data-theme="light"] .fch-clinical-updates-page {
          background: linear-gradient(180deg, #F8FAFF 0%, #EEF4FF 45%, #F8FAFC 100%) !important;
          color: #0F172A !important;
        }

        html:not(.dark) .fch-clinical-title,
        body.light .fch-clinical-title,
        html.light .fch-clinical-title,
        :root[data-theme="light"] .fch-clinical-title {
          color: #0F172A !important;
        }

        html:not(.dark) .fch-clinical-muted,
        body.light .fch-clinical-muted,
        html.light .fch-clinical-muted,
        :root[data-theme="light"] .fch-clinical-muted {
          color: #475569 !important;
        }

        html:not(.dark) .fch-clinical-surface,
        body.light .fch-clinical-surface,
        html.light .fch-clinical-surface,
        :root[data-theme="light"] .fch-clinical-surface {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(99, 102, 241, 0.14) !important;
          color: #0F172A !important;
          box-shadow: 0 18px 46px rgba(59, 130, 246, 0.12) !important;
        }

        html:not(.dark) .fch-clinical-input,
        body.light .fch-clinical-input,
        html.light .fch-clinical-input,
        :root[data-theme="light"] .fch-clinical-input {
          color: #0F172A !important;
        }
      `}</style>

      <div className="fch-clinical-updates-page relative z-10 min-h-screen px-5 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200 backdrop-blur-xl">
              <Sparkles size={14} /> Biblioteca científica
            </div>
            <h1 className="fch-clinical-title text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              Artigos científicos
            </h1>
            <p className="fch-clinical-muted mt-3 max-w-2xl text-sm font-bold leading-relaxed text-slate-300 sm:text-base">
              Atualizações clínicas, estudos e conteúdos científicos para apoiar o raciocínio do fisioterapeuta.
            </p>
          </div>

          <div className="fch-clinical-surface mb-5 rounded-[2rem] border border-white/10 bg-white/10 p-4 backdrop-blur-2xl sm:p-5">
            <div className="flex items-center gap-4">
              <Search className="h-7 w-7 shrink-0 text-slate-300" strokeWidth={2.6} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="fch-clinical-input min-w-0 flex-1 bg-transparent text-lg font-black text-white outline-none placeholder:text-slate-400 sm:text-xl"
                placeholder="Pesquisar por tema, área ou artigo..."
              />
            </div>
          </div>

          <div className="mb-7 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition-all',
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20'
                    : 'fch-clinical-surface border border-white/10 bg-white/10 text-slate-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="fch-clinical-surface flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-center backdrop-blur-xl">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-cyan-300" />
              <p className="fch-clinical-muted text-sm font-black uppercase tracking-[0.2em] text-slate-300">Carregando artigos</p>
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="fch-clinical-surface rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur-xl">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
              <h2 className="fch-clinical-title text-2xl font-black text-white">Nada encontrado</h2>
              <p className="fch-clinical-muted mt-2 text-sm font-bold text-slate-300">Tente buscar por lombar, joelho, neuro, ortopedia ou reabilitação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUpdates.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.32 }}
                  className="fch-clinical-surface group overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-[0_22px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 p-3 text-white shadow-lg shadow-blue-500/20">
                      <Stethoscope size={28} />
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 ring-1 ring-white/10">
                      {item.source || 'Artigo'}
                    </span>
                  </div>

                  <h2 className="fch-clinical-title line-clamp-3 text-2xl font-black leading-none tracking-[-0.04em] text-white">
                    {item.title}
                  </h2>
                  <p className="fch-clinical-muted mt-3 line-clamp-4 text-sm font-bold leading-relaxed text-slate-300">
                    {item.summary || 'Resumo clínico disponível para consulta e estudo profissional.'}
                  </p>

                  <div className="mt-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
                    <CalendarDays size={15} />
                    <span>{formatDate(item.published_at || item.created_at)}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/10">
                      {item.category || 'Atualização'}
                    </span>
                    {item.id.startsWith('fallback-') ? (
                      item.source_url ? (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 transition-all hover:-translate-y-0.5"
                        >
                          Fonte <ExternalLink size={14} />
                        </a>
                      ) : null
                    ) : (
                      <Link
                        to={`/clinical-updates/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 transition-all hover:-translate-y-0.5"
                      >
                        Ler <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
