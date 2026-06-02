import { useMemo, useState } from 'react';
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

interface ClinicalTest {
  id: string;
  name: string;
  region: string;
  category: string;
  objective: string;
  execution: string;
  positive: string;
  interpretation: string;
  precautions: string;
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
    interpretation: 'Pode sugerir irritação subacromial, tendinopatia do manguito rotador ou conflito mecânico funcional.',
    precautions: 'Evite força excessiva e correlacione com história clínica, arco doloroso e outros testes do ombro.',
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
    interpretation: 'Achado compatível com síndrome do impacto quando associado a outros sinais clínicos.',
    precautions: 'Não interpretar isoladamente; observar irritabilidade, amplitude e tolerância do paciente.',
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
    interpretation: 'Pode sugerir disfunção do supraespinal, tendinopatia ou alteração de controle escapular.',
    precautions: 'Comparar bilateralmente e diferenciar dor de fraqueza real.',
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
    interpretation: 'Achado sugestivo de instabilidade anterior, especialmente quando comparado ao lado contralateral.',
    precautions: 'Evitar em trauma agudo muito doloroso sem avaliação médica; observar edema e proteção muscular.',
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
    interpretation: 'Pode indicar envolvimento meniscal, especialmente com dor localizada e história compatível.',
    precautions: 'Executar com suavidade; não forçar amplitudes dolorosas.',
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
    interpretation: 'Pode sugerir sensibilização neural ou componente neurodinâmico nos sintomas.',
    precautions: 'Diferenciar tensão muscular de sintoma neural; respeitar irritabilidade.',
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
    interpretation: 'Pode indicar envolvimento radicular quando associado a exame neurológico e história clínica.',
    precautions: 'Evitar em sinais neurológicos graves, trauma, tontura intensa ou suspeita vascular.',
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
    interpretation: 'Ajuda a monitorar evolução funcional e risco de queda no contexto clínico.',
    precautions: 'Garantir segurança, cadeira adequada e supervisão próxima.',
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
    interpretation: 'Útil para evolução, prescrição de exercício e acompanhamento cardiorrespiratório.',
    precautions: 'Monitorar segurança, Borg, pressão, frequência cardíaca e saturação quando indicado.',
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

export default function ClinicalTestsHub() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(clinicalTests[0]);

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clinicalTests.filter((test) => {
      const matchesCategory = activeCategory === 'Todos' || test.region === activeCategory || test.category === activeCategory;
      const matchesSearch = !normalizedQuery
        || test.name.toLowerCase().includes(normalizedQuery)
        || test.region.toLowerCase().includes(normalizedQuery)
        || test.category.toLowerCase().includes(normalizedQuery)
        || test.objective.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query]);

  return (
    <div className="clinical-tests-hub min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8fbff] px-3 pb-24 pt-6 text-slate-950 transition-colors duration-300 dark:bg-[#050b1f] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-hidden">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-full overflow-hidden rounded-[2rem] border border-violet-200/70 bg-white p-4 shadow-2xl shadow-blue-200/40 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-blue-950/30 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.20),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_30%)]" />
          <div className="relative grid min-w-0 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                <Sparkles size={14} /> Premium Clinical Intelligence
              </div>
              <div>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                  Clinical Tests <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Hub</span>
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                  Biblioteca premium para consulta rápida de testes ortopédicos, funcionais, neurofuncionais e cardiorrespiratórios dentro da rotina do fisioterapeuta.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                      <Icon className="mb-3 text-blue-600 dark:text-blue-300" size={22} />
                      <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-600 p-1 shadow-2xl shadow-violet-300/40 dark:border-white/10 dark:shadow-violet-950/40">
                <div className="rounded-[1.75rem] bg-white/95 p-5 dark:bg-slate-950/90">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Mapa clínico</p>
                      <h2 className="text-2xl font-black text-slate-950 dark:text-white">Regiões prioritárias</h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <Stethoscope size={24} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.slice(1, 7).map((category, index) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-all',
                          activeCategory === category
                            ? 'border-violet-400 bg-violet-100 text-violet-900 shadow-lg shadow-violet-200/60 dark:border-violet-300/40 dark:bg-violet-500/20 dark:text-white dark:shadow-none'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
                        )}
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                          <span className="text-sm font-black text-blue-600 dark:text-blue-200">{index + 1}</span>
                        </div>
                        <p className="text-sm font-black">{category}</p>
                        <p className="mt-1 text-[10px] font-semibold opacity-70">Ver testes</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid w-full min-w-0 max-w-full gap-6 overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="w-full max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
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

            <div className="space-y-3">
              {filteredTests.map((test) => {
                const Icon = test.icon;
                const isActive = selectedTest?.id === test.id;
                return (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTest(test)}
                    className={cn(
                      'group w-full max-w-full overflow-hidden rounded-[1.75rem] border p-3 text-left transition-all sm:p-4',
                      isActive
                        ? 'border-blue-300 bg-white shadow-2xl shadow-blue-200/60 dark:border-blue-300/30 dark:bg-white/10 dark:shadow-blue-950/20'
                        : 'border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40 hover:border-violet-300 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none dark:hover:bg-white/5',
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      <div className={cn('flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', test.gradient)}>
                        <Icon size={24} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="min-w-0 break-words text-base font-black text-slate-950 dark:text-white">{test.name}</h3>
                          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{test.level}</span>
                        </div>
                        <p className="mt-1 break-words text-xs font-bold uppercase tracking-widest text-slate-400">{test.region} • {test.category}</p>
                        <p className="mt-2 line-clamp-2 break-words text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{test.objective}</p>
                      </div>
                      <ChevronRight className={cn('mt-4 shrink-0 transition-transform group-hover:translate-x-1', isActive ? 'text-blue-500' : 'text-slate-300')} size={20} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full min-w-0 max-w-full overflow-hidden lg:sticky lg:top-24 lg:self-start">
            {selectedTest ? (() => {
              const SelectedIcon = selectedTest.icon;
              return (
              <motion.div
                key={selectedTest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-blue-200/50 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-blue-950/30 sm:rounded-[2.2rem]"
              >
                <div className={cn('relative overflow-hidden bg-gradient-to-br p-5 text-white sm:p-6', selectedTest.gradient)}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_34%)]" />
                  <div className="relative flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="break-words text-[10px] font-black uppercase tracking-[0.24em] text-white/75">{selectedTest.region} • {selectedTest.category}</p>
                      <h2 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">{selectedTest.name}</h2>
                      <p className="mt-3 max-w-xl break-words text-sm font-medium leading-relaxed text-white/85">{selectedTest.objective}</p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                      <SelectedIcon size={28} />
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-4 p-4 sm:p-6">
                  <InfoCard icon={Target} title="Objetivo clínico" content={selectedTest.objective} tone="blue" />
                  <InfoCard icon={Activity} title="Como executar" content={selectedTest.execution} tone="violet" />
                  <InfoCard icon={CheckCircle2} title="Resultado positivo" content={selectedTest.positive} tone="emerald" />
                  <InfoCard icon={Eye} title="Interpretação" content={selectedTest.interpretation} tone="amber" />
                  <InfoCard icon={AlertTriangle} title="Cuidados e contraindicações" content={selectedTest.precautions} tone="rose" />

                  <div className="max-w-full overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300" size={22} />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Sugestão para prontuário</h3>
                        <p className="mt-2 break-words text-sm font-medium leading-relaxed text-emerald-900 dark:text-emerald-50/90">
                          {selectedTest.name}: registrar lado avaliado, resposta dolorosa, comparação bilateral e relação com queixa funcional do paciente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
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
    </div>
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
    <div className={cn('max-w-full overflow-hidden rounded-[1.5rem] border p-4', toneClass)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={18} />
        <h3 className="text-[11px] font-black uppercase tracking-widest">{title}</h3>
      </div>
      <p className="break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-white/85">{content}</p>
    </div>
  );
}
