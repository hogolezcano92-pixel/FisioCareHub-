import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ExternalLink,
  Lightbulb,
  Loader2,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveClinicalImage, resolveClinicalImageLabel } from '../lib/clinicalImageResolver';

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
  image_key?: string | null;
  is_featured?: boolean | null;
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  pubmed: 'Artigo científico',
  frontiers: 'Artigo Frontiers',
  gnews: 'Notícia',
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

const getClinicalBullets = (item: ClinicalUpdate) => {
  const summary = String(item.summary || '').trim();
  const area = resolveClinicalImageLabel(imageInputFromUpdate(item));
  const sourceType = normalizeType(item.source_type);

  return [
    `${sourceType} relacionado à área de ${area}.`,
    summary || 'Resumo clínico indisponível no momento. Consulte a fonte original para detalhes.',
    'Use este conteúdo como atualização profissional, não como protocolo individual para todos os pacientes.',
  ];
};

const buildPracticalApplication = (item: ClinicalUpdate) => {
  const area = resolveClinicalImageLabel(imageInputFromUpdate(item));

  const applications: Record<string, string> = {
    'Neurologia': 'Pode apoiar raciocínio sobre marcha, equilíbrio, coordenação, neuroplasticidade, funcionalidade e acompanhamento progressivo do paciente.',
    'Ortopedia': 'Pode ajudar o fisioterapeuta a refletir sobre avaliação funcional, dor, mobilidade, progressão de exercícios e retorno às atividades.',
    'Geriatria': 'Pode apoiar decisões sobre prevenção de quedas, força, autonomia, mobilidade e funcionalidade em idosos.',
    'Cardiorrespiratória': 'Pode contribuir para atualização sobre tolerância ao esforço, segurança, monitoramento e reabilitação cardiorrespiratória.',
    'Saúde pélvica': 'Pode apoiar raciocínio sobre função do assoalho pélvico, educação em saúde, progressão terapêutica e acompanhamento seguro.',
    'Saúde da mulher': 'Pode contribuir para atualização em cuidado funcional, prevenção, qualidade de vida e orientação clínica específica para mulheres.',
    'Saúde do homem': 'Pode contribuir para atualização em cuidado funcional, prevenção, qualidade de vida e orientação clínica específica para homens.',
    'Dermatofuncional': 'Pode apoiar raciocínio sobre função tecidual, cicatrização, edema, linfedema, cuidados pós-operatórios e reabilitação dermatofuncional.',
  };

  return applications[area] || 'Pode servir como inspiração para atualização clínica, educação em saúde e tomada de decisão baseada em evidências.';
};

export default function ClinicalUpdateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [update, setUpdate] = useState<ClinicalUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUpdate = useCallback(async () => {
    if (!id) {
      setErrorMessage('Atualização clínica não encontrada.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('clinical_updates')
        .select('id, title, summary, source, source_url, source_type, category, published_at, image_url, image_key, is_featured')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      setUpdate(data as ClinicalUpdate);
    } catch (error: any) {
      console.info('[ClinicalUpdateDetail] Falha ao carregar atualização:', error);
      setErrorMessage('Não foi possível carregar esta atualização clínica.');
      setUpdate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUpdate();
  }, [loadUpdate]);

  const bullets = useMemo(() => update ? getClinicalBullets(update) : [], [update]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-sky-300" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-300">Carregando atualização...</p>
        </div>
      </div>
    );
  }

  if (!update || errorMessage) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl">
          <h1 className="mb-3 text-2xl font-black text-white">Atualização não encontrada</h1>
          <p className="text-sm font-semibold leading-6 text-slate-400">{errorMessage || 'Este conteúdo não está disponível.'}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const imageInput = imageInputFromUpdate(update);
  const image = resolveClinicalImage(imageInput);
  const area = resolveClinicalImageLabel(imageInput);

  return (
    <main className="clinical-update-detail-light mx-auto max-w-5xl space-y-6 pb-10 text-slate-900 dark:text-white">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 shadow-lg shadow-violet-100/70 transition-all hover:bg-violet-50 hover:text-slate-950 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:shadow-slate-950/20 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <article className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white text-slate-900 shadow-2xl shadow-violet-100/70 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-black/30">
        <section className="relative min-h-[360px] overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img src={image} alt="Imagem clínica da atualização" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/35 to-transparent dark:from-slate-950 dark:via-slate-950/70 dark:to-slate-950/15" />

          <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-5 sm:p-8">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-slate-950/70 dark:text-sky-100">
              <BookOpenCheck size={13} /> Ler no FisioCareHub
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-sky-200">
              <span className="rounded-full border border-sky-200 bg-sky-50/95 px-2.5 py-1 text-sky-800 shadow-sm dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200">{normalizeType(update.source_type)}</span>
              <span className="rounded-full border border-violet-100 bg-white/95 px-2.5 py-1 text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-sky-200">{area}</span>
              <span className="rounded-full border border-violet-100 bg-white/95 px-2.5 py-1 text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-sky-200">{formatDate(update.published_at)}</span>
            </div>

            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-slate-950 drop-shadow-[0_2px_14px_rgba(255,255,255,0.45)] sm:text-5xl dark:text-white dark:drop-shadow-none">
              {update.title}
            </h1>
          </div>
        </section>

        <section className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-5">
            <ContentCard icon={<Sparkles size={18} className="text-sky-300" />} title="Resumo em português">
              <p className="clinical-light-muted text-base font-semibold leading-8 text-slate-700 dark:text-slate-300">
                {update.summary || 'Resumo indisponível no momento. Use o botão de fonte original para conferir mais detalhes.'}
              </p>
            </ContentCard>

            <ContentCard icon={<Lightbulb size={18} className="text-amber-300" />} title="Pontos principais">
              <div className="space-y-3">
                {bullets.map((bullet, index) => (
                  <div key={index} className="clinical-light-card flex gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100/50 dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                      {index + 1}
                    </div>
                    <p className="clinical-light-muted text-sm font-semibold leading-7 text-slate-700 dark:text-slate-300">{bullet}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

            <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm shadow-emerald-100/60 dark:border-emerald-300/15 dark:bg-emerald-400/[0.06] dark:shadow-none">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-100">
                <Stethoscope size={17} /> Aplicação prática
              </div>
              <p className="text-sm font-semibold leading-7 text-emerald-900 dark:text-emerald-50/80">
                {buildPracticalApplication(update)}
              </p>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-500">Detalhes</p>
              <div className="space-y-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <InfoRow icon={<Newspaper size={15} />} label="Fonte" value={update.source || 'Fonte não informada'} />
                <InfoRow icon={<CalendarDays size={15} />} label="Data" value={formatDate(update.published_at)} />
                <InfoRow icon={<BookOpenCheck size={15} />} label="Leitura" value={getReadingTime(`${update.title} ${update.summary || ''}`)} />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 shadow-sm shadow-amber-100/60 dark:border-amber-300/15 dark:bg-amber-400/[0.06] dark:shadow-none">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-100">
                <ShieldCheck size={17} /> Observação clínica
              </div>
              <p className="text-xs font-semibold leading-6 text-slate-700 dark:text-amber-50/80">
                Este conteúdo é um resumo informativo gerado a partir da fonte original. Ele não substitui avaliação, julgamento clínico nem leitura completa do estudo/notícia.
              </p>
            </div>

            <button
              type="button"
              onClick={() => update.source_url && window.open(update.source_url, '_blank', 'noopener,noreferrer')}
              disabled={!update.source_url}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Abrir fonte original <ExternalLink size={16} />
            </button>
          </aside>
        </section>
      </article>
    </main>
  );
}

function ContentCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        {icon} {title}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-none">
      <div className="mt-0.5 text-sky-600 dark:text-sky-300">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}
