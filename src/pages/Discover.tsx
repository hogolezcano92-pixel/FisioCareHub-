import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calendar,
  Dumbbell,
  FileText,
  HeartPulse,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  TestTube2,
  UserRoundSearch,
  Users,
  Video,
  Wallet,
  Wind,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

type ShortcutItem = {
  title: string;
  subtitle: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
};

type DiscoverCard = {
  title: string;
  subtitle: string;
  path: string;
  icon: React.ElementType;
  accent: string;
  imageTone: string;
  keywords: string[];
  badge?: string;
};

const patientShortcuts: ShortcutItem[] = [
  {
    title: 'Fisioterapeutas',
    subtitle: 'Encontre profissionais',
    path: '/buscar-fisio',
    icon: UserRoundSearch,
    keywords: ['buscar', 'fisioterapeuta', 'profissional', 'atendimento'],
  },
  {
    title: 'Exercícios',
    subtitle: 'Treinos prescritos',
    path: '/treinos',
    icon: Dumbbell,
    keywords: ['exercícios', 'treinos', 'fortalecimento', 'alongamento'],
  },
  {
    title: 'Biblioteca',
    subtitle: 'Conteúdos de saúde',
    path: '/patient/library',
    icon: BookOpen,
    keywords: ['biblioteca', 'artigos', 'conteúdo', 'saúde'],
  },
  {
    title: 'FisioStore',
    subtitle: 'Produtos úteis',
    path: '/loja',
    icon: ShoppingBag,
    keywords: ['loja', 'produtos', 'fisiostore', 'acessórios'],
  },
];

const physioShortcuts: ShortcutItem[] = [
  {
    title: 'Pacientes',
    subtitle: 'Gestão clínica',
    path: '/patients',
    icon: Users,
    keywords: ['pacientes', 'gestão', 'clínica'],
  },
  {
    title: 'Exercícios',
    subtitle: 'Prescrição PRO',
    path: '/exercises',
    icon: Dumbbell,
    keywords: ['exercícios', 'prescrição', 'treino'],
  },
  {
    title: 'Testes',
    subtitle: 'Clinical Tests Hub',
    path: '/clinical-tests',
    icon: TestTube2,
    keywords: ['testes', 'clínicos', 'clinical', 'hub'],
  },
  {
    title: 'FisioStore',
    subtitle: 'Materiais e loja',
    path: '/loja',
    icon: ShoppingBag,
    keywords: ['loja', 'produtos', 'fisiostore'],
  },
];

const patientCards: DiscoverCard[] = [
  {
    title: 'Dor Lombar',
    subtitle: 'Coluna, postura e exercícios seguros',
    path: '/patient/library',
    icon: HeartPulse,
    accent: 'from-blue-500 via-indigo-500 to-violet-600',
    imageTone: 'bg-blue-100 text-blue-700',
    keywords: ['lombar', 'coluna', 'costas', 'postura', 'dor'],
    badge: 'Popular',
  },
  {
    title: 'Joelho',
    subtitle: 'Fortalecimento, mobilidade e prevenção',
    path: '/patient/library',
    icon: Activity,
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
    imageTone: 'bg-emerald-100 text-emerald-700',
    keywords: ['joelho', 'fortalecimento', 'lesão', 'mobilidade'],
  },
  {
    title: 'Cervical',
    subtitle: 'Pescoço, tensão e ergonomia diária',
    path: '/patient/library',
    icon: Stethoscope,
    accent: 'from-violet-500 via-fuchsia-500 to-pink-500',
    imageTone: 'bg-violet-100 text-violet-700',
    keywords: ['cervical', 'pescoço', 'tensão', 'ergonomia'],
  },
  {
    title: 'Ombro',
    subtitle: 'Mobilidade e controle da dor',
    path: '/patient/library',
    icon: ShieldCheck,
    accent: 'from-orange-400 via-amber-500 to-yellow-500',
    imageTone: 'bg-amber-100 text-amber-700',
    keywords: ['ombro', 'manguito', 'mobilidade', 'dor'],
  },
  {
    title: 'Idosos',
    subtitle: 'Equilíbrio, força e prevenção de quedas',
    path: '/patient/library',
    icon: Users,
    accent: 'from-sky-500 via-blue-500 to-cyan-500',
    imageTone: 'bg-sky-100 text-sky-700',
    keywords: ['idosos', 'equilíbrio', 'quedas', 'geriatria'],
  },
  {
    title: 'Respiratória',
    subtitle: 'Respiração, condicionamento e cuidado',
    path: '/patient/library',
    icon: Wind,
    accent: 'from-cyan-500 via-blue-500 to-indigo-500',
    imageTone: 'bg-cyan-100 text-cyan-700',
    keywords: ['respiratória', 'respiração', 'pulmão', 'condicionamento'],
  },
  {
    title: 'Exames IA',
    subtitle: 'Analise exames e receba orientação inicial',
    path: '/exames-ia',
    icon: BrainCircuit,
    accent: 'from-purple-600 via-indigo-600 to-blue-600',
    imageTone: 'bg-purple-100 text-purple-700',
    keywords: ['exames', 'ia', 'imagem', 'análise'],
    badge: 'IA',
  },
  {
    title: 'FisioStore',
    subtitle: 'Produtos para reabilitação e conforto',
    path: '/loja',
    icon: ShoppingBag,
    accent: 'from-teal-500 via-emerald-500 to-lime-500',
    imageTone: 'bg-teal-100 text-teal-700',
    keywords: ['loja', 'fisiostore', 'produtos', 'reabilitação'],
  },
];

const physioCards: DiscoverCard[] = [
  {
    title: 'Biblioteca Clínica',
    subtitle: 'Conteúdos, artigos e atualizações',
    path: '/biblioteca',
    icon: BookOpen,
    accent: 'from-indigo-600 via-violet-600 to-purple-600',
    imageTone: 'bg-indigo-100 text-indigo-700',
    keywords: ['biblioteca', 'artigos', 'clínica', 'atualizações'],
  },
  {
    title: 'Testes Clínicos',
    subtitle: 'Avaliações rápidas para consulta',
    path: '/clinical-tests',
    icon: TestTube2,
    accent: 'from-emerald-500 via-teal-500 to-cyan-500',
    imageTone: 'bg-emerald-100 text-emerald-700',
    keywords: ['testes', 'clínicos', 'avaliação', 'clinical'],
    badge: 'PRO',
  },
  {
    title: 'Prescrição',
    subtitle: 'Monte exercícios para seus pacientes',
    path: '/exercises',
    icon: Dumbbell,
    accent: 'from-blue-500 via-indigo-500 to-violet-600',
    imageTone: 'bg-blue-100 text-blue-700',
    keywords: ['prescrição', 'exercícios', 'pacientes'],
    badge: 'PRO',
  },
  {
    title: 'Exames IA',
    subtitle: 'Apoio inteligente para análise inicial',
    path: '/exames-ia',
    icon: BrainCircuit,
    accent: 'from-purple-600 via-fuchsia-600 to-pink-500',
    imageTone: 'bg-purple-100 text-purple-700',
    keywords: ['exames', 'ia', 'análise', 'imagem'],
    badge: 'IA',
  },
  {
    title: 'Agenda',
    subtitle: 'Organize consultas e atendimentos',
    path: '/agenda',
    icon: Calendar,
    accent: 'from-cyan-500 via-sky-500 to-blue-500',
    imageTone: 'bg-sky-100 text-sky-700',
    keywords: ['agenda', 'consultas', 'atendimentos'],
  },
  {
    title: 'Financeiro',
    subtitle: 'Ganhos, repasses e relatórios',
    path: '/profile?tab=earnings',
    icon: Wallet,
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    imageTone: 'bg-amber-100 text-amber-700',
    keywords: ['financeiro', 'ganhos', 'repasses', 'relatórios'],
    badge: 'PRO',
  },
  {
    title: 'Teleconsulta',
    subtitle: 'Atendimento online com segurança',
    path: '/telehealth',
    icon: Video,
    accent: 'from-slate-700 via-blue-700 to-indigo-700',
    imageTone: 'bg-slate-100 text-slate-700',
    keywords: ['teleconsulta', 'vídeo', 'online', 'telehealth'],
    badge: 'PRO',
  },
  {
    title: 'FisioStore',
    subtitle: 'Produtos e recursos para reabilitação',
    path: '/loja',
    icon: ShoppingBag,
    accent: 'from-teal-500 via-emerald-500 to-lime-500',
    imageTone: 'bg-teal-100 text-teal-700',
    keywords: ['loja', 'fisiostore', 'produtos'],
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchesSearch = (term: string, title: string, subtitle: string, keywords: string[]) => {
  const query = normalize(term.trim());
  if (!query) return true;
  return normalize([title, subtitle, ...keywords].join(' ')).includes(query);
};

export default function Discover() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const shortcuts = isPhysio ? physioShortcuts : patientShortcuts;
  const cards = isPhysio ? physioCards : patientCards;

  const filteredShortcuts = useMemo(
    () => shortcuts.filter((item) => matchesSearch(searchTerm, item.title, item.subtitle, item.keywords)),
    [searchTerm, shortcuts]
  );

  const filteredCards = useMemo(
    () => cards.filter((item) => matchesSearch(searchTerm, item.title, item.subtitle, item.keywords)),
    [searchTerm, cards]
  );

  const hasResults = filteredShortcuts.length > 0 || filteredCards.length > 0;

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 pb-32 text-white transition-colors duration-300 dark:bg-slate-950 md:pb-16">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(79,70,229,0.30),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(14,165,233,0.20),transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      </div>

      <style>{`
        html:not(.dark) .fch-discover-page,
        body.light .fch-discover-page,
        html.light .fch-discover-page,
        :root[data-theme="light"] .fch-discover-page {
          background: linear-gradient(180deg, #F8FAFF 0%, #EEF4FF 45%, #F8FAFC 100%) !important;
          color: #0F172A !important;
        }


        html:not(.dark) .fch-discover-title,
        body.light .fch-discover-title,
        html.light .fch-discover-title,
        :root[data-theme="light"] .fch-discover-title {
          color: #0F172A !important;
        }

        html:not(.dark) .fch-discover-kicker,
        body.light .fch-discover-kicker,
        html.light .fch-discover-kicker,
        :root[data-theme="light"] .fch-discover-kicker {
          background: rgba(79, 70, 229, 0.09) !important;
          border-color: rgba(99, 102, 241, 0.18) !important;
          color: #4F46E5 !important;
        }

        html:not(.dark) .fch-discover-shortcut-icon,
        body.light .fch-discover-shortcut-icon,
        html.light .fch-discover-shortcut-icon,
        :root[data-theme="light"] .fch-discover-shortcut-icon {
          background: linear-gradient(135deg, #2563EB, #7C3AED) !important;
          color: #FFFFFF !important;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18) !important;
        }

        html:not(.dark) .fch-discover-muted,
        body.light .fch-discover-muted,
        html.light .fch-discover-muted,
        :root[data-theme="light"] .fch-discover-muted {
          color: #475569 !important;
        }

        html:not(.dark) .fch-discover-search,
        body.light .fch-discover-search,
        html.light .fch-discover-search,
        :root[data-theme="light"] .fch-discover-search {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(99, 102, 241, 0.16) !important;
          box-shadow: 0 18px 46px rgba(59, 130, 246, 0.14) !important;
        }

        html:not(.dark) .fch-discover-search input,
        body.light .fch-discover-search input,
        html.light .fch-discover-search input,
        :root[data-theme="light"] .fch-discover-search input {
          color: #0F172A !important;
        }

        html:not(.dark) .fch-discover-shortcut,
        body.light .fch-discover-shortcut,
        html.light .fch-discover-shortcut,
        :root[data-theme="light"] .fch-discover-shortcut {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(99, 102, 241, 0.14) !important;
          color: #0F172A !important;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08) !important;
        }
      `}</style>

      <div className="fch-discover-page relative z-10 min-h-screen px-5 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className="fch-discover-kicker mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200 backdrop-blur-xl dark:text-cyan-200">
                <Sparkles size={14} /> FisioCareHub
              </div>
              <h1 className="fch-discover-title text-5xl font-black tracking-[-0.08em] text-white dark:text-white sm:text-6xl lg:text-7xl">
                Descubra
              </h1>
              <p className="fch-discover-muted mt-3 max-w-xl text-sm font-bold leading-relaxed text-slate-300 sm:text-base">
                Explore exercícios, biblioteca, ferramentas clínicas, produtos e caminhos rápidos para cuidar melhor da reabilitação.
              </p>
            </div>
          </div>

          <div className="fch-discover-search relative mb-7 overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10" />
            <div className="relative flex items-center gap-4 px-5 py-4 sm:px-7 sm:py-5">
              <Search className="h-8 w-8 shrink-0 text-slate-300 dark:text-slate-300" strokeWidth={2.6} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-slate-400 sm:text-2xl"
                placeholder="Pesquisar dores, exercícios, exames, produtos..."
              />
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {filteredShortcuts.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                >
                  <Link
                    to={item.path}
                    className="fch-discover-shortcut group flex min-h-[104px] items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15 active:scale-[0.98]"
                  >
                    <span className="fch-discover-shortcut-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 group-hover:scale-105">
                      <Icon size={26} strokeWidth={2.7} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black leading-tight tracking-tight sm:text-xl">{item.title}</span>
                      <span className="fch-discover-muted mt-1 block text-xs font-bold text-slate-300">{item.subtitle}</span>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {!hasResults ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-cyan-200">
                <Search size={30} />
              </div>
              <h2 className="fch-discover-title text-2xl font-black tracking-tight text-white dark:text-white">Nada encontrado</h2>
              <p className="fch-discover-muted mt-2 text-sm font-bold text-slate-300">
                Tente buscar por lombar, joelho, exames, loja, agenda ou exercícios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.035, duration: 0.36 }}
                  >
                    <Link
                      to={card.path}
                      className={cn(
                        'group relative block min-h-[172px] overflow-hidden rounded-[1.65rem] bg-gradient-to-br p-5 text-white shadow-[0_22px_48px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_62px_rgba(37,99,235,0.25)] active:scale-[0.985]',
                        card.accent
                      )}
                    >
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl transition-transform group-hover:scale-125" />
                      <div className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-black/15 blur-2xl" />

                      <div className="relative flex min-h-[132px] flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {card.badge && (
                              <span className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white ring-1 ring-white/20">
                                {card.badge}
                              </span>
                            )}
                            <h2 className="max-w-[170px] text-3xl font-black leading-none tracking-[-0.05em] sm:text-[2rem]">
                              {card.title}
                            </h2>
                            <p className="mt-3 max-w-[190px] text-sm font-bold leading-snug text-white/80">
                              {card.subtitle}
                            </p>
                          </div>

                          <div className={cn('rotate-6 rounded-[1.35rem] p-4 shadow-2xl ring-1 ring-white/60 transition-all group-hover:rotate-3 group-hover:scale-105', card.imageTone)}>
                            <Icon size={42} strokeWidth={2.5} />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm font-black text-white/90">
                          Abrir <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20">
                  <FileText size={27} />
                </div>
                <div>
                  <h3 className="fch-discover-title text-xl font-black tracking-tight text-white dark:text-white">Conteúdo em destaque</h3>
                  <p className="fch-discover-muted text-sm font-bold text-slate-300">
                    {isPhysio
                      ? 'Use a biblioteca e os testes clínicos para agilizar sua rotina.'
                      : 'Aprenda sobre sua recuperação com linguagem simples e segura.'}
                  </p>
                </div>
              </div>
              <Link
                to={isPhysio ? '/biblioteca' : '/patient/library'}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Ver biblioteca <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
