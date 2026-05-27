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
import { cn } from '../lib/utils';

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

  if (!isManualContent) return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Geral;

  return item.image_url || CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Geral;
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
        .select('id, title, summary, source, source_url, source_type, category, published_at, image_url, is_featured')
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

  const image = getClinicalImage(update);

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 shadow-lg shadow-slate-950/20 transition-all hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/30">
        <section className="relative min-h-[360px] overflow-hidden bg-slate-900">
          <img src={image} alt="Imagem clínica da atualização" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/15" />

          <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-5 sm:p-8">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100 backdrop-blur-md">
              <BookOpenCheck size={13} /> Ler no FisioCareHub
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1">{normalizeType(update.source_type)}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{inferCategoryFromText(update)}</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{formatDate(update.published_at)}</span>
            </div>

            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              {update.title}
            </h1>
          </div>
        </section>

        <section className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-5">
            <ContentCard icon={<Sparkles size={18} className="text-sky-300" />} title="Resumo em português">
              <p className="text-base font-semibold leading-8 text-slate-300">
                {update.summary || 'Resumo indisponível no momento. Use o botão de fonte original para conferir mais detalhes.'}
              </p>
            </ContentCard>

            <ContentCard icon={<Lightbulb size={18} className="text-amber-300" />} title="Pontos principais">
              <div className="space-y-3">
                {bullets.map((bullet, index) => (
                  <div key={index} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-xs font-black text-sky-200">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold leading-7 text-slate-300">{bullet}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

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
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        {icon} {title}
      </div>
      {children}
    </section>
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
