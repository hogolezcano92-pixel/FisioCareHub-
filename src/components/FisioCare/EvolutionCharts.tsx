import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { Activity, CheckCircle2, Sparkles, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EvolutionChartsProps {
  painData?: any[];
  exerciseData?: any[];
  melhora?: number;
  className?: string;
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const EMPTY_PAIN_DATA = WEEK_DAYS.map((day) => ({ day, level: 0, empty: true }));
const EMPTY_EXERCISE_DATA = WEEK_DAYS.map((day) => ({ day, completed: 0, total: 0 }));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function EvolutionCharts({
  painData = [],
  exerciseData = [],
  melhora = 0,
  className,
}: EvolutionChartsProps) {
  const hasPainRecords = painData.some((item) => getOptionalNumber(item?.level ?? item?.nivel_dor ?? item?.intensidade) !== null);
  const displayPainData = (hasPainRecords ? painData : EMPTY_PAIN_DATA).map((item, index) => ({
    day: item?.day || WEEK_DAYS[index] || '',
    level: hasPainRecords ? getOptionalNumber(item?.level ?? item?.nivel_dor ?? item?.intensidade) : 0,
  }));

  const displayExerciseData = (exerciseData.length > 0 ? exerciseData : EMPTY_EXERCISE_DATA).map((item, index) => ({
    day: item?.day || WEEK_DAYS[index] || '',
    completed: Math.max(0, getNumber(item?.completed ?? item?.concluidos ?? item?.realizados, 0)),
    total: Math.max(0, getNumber(item?.total ?? item?.prescritos ?? item?.exercicios, 0)),
  }));

  const validPainLevels = displayPainData
    .map((item) => getOptionalNumber(item.level))
    .filter((value): value is number => value !== null)
    .map((value) => clamp(value, 0, 10));

  const currentPain = validPainLevels.length > 0 ? validPainLevels[validPainLevels.length - 1] : 0;
  const initialPain = validPainLevels.length > 0 ? validPainLevels[0] : currentPain;
  const calculatedImprovement = initialPain > 0
    ? Math.round(((initialPain - currentPain) / initialPain) * 100)
    : 0;
  const improvement = clamp(getNumber(melhora || calculatedImprovement, 0), 0, 100);

  const totalCompleted = displayExerciseData.reduce((acc, item) => acc + getNumber(item?.completed, 0), 0);
  const totalExercises = displayExerciseData.reduce((acc, item) => acc + getNumber(item?.total, 0), 0);
  const adherencePercent = totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;
  const safeAdherence = clamp(adherencePercent, 0, 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference - (safeAdherence / 100) * circumference;
  const maxDailyTotal = Math.max(1, ...displayExerciseData.map((item) => getNumber(item?.total, 0)));

  const painStatus = !hasPainRecords
    ? 'Sem registro semanal'
    : currentPain <= 2
      ? 'Controle excelente'
      : currentPain <= 5
        ? 'Acompanhar evolução'
        : 'Atenção clínica';
  const adherenceStatus = totalExercises === 0
    ? 'Sem treinos na semana'
    : safeAdherence >= 85
      ? 'Excelente'
      : safeAdherence >= 50
        ? 'Em evolução'
        : 'Precisa de estímulo';

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {/* Evolução da dor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(59,130,246,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-2xl sm:p-5"
      >
        <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-500 shadow-inner dark:border-sky-400/20 dark:bg-sky-400/10">
              <Activity size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-500">Dor</p>
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Evolução da dor</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Escala clínica de 0 a 10</p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400">{improvement}%</p>
            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">melhora</p>
          </div>
        </div>

        <div className="relative z-10 mt-5 space-y-4 sm:grid sm:grid-cols-[auto_1fr] sm:items-end sm:gap-4 sm:space-y-0">
          <div className="rounded-3xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Dor atual</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-4xl font-black leading-none tracking-tight text-slate-950 dark:text-white">{currentPain}</span>
              <span className="pb-1 text-sm font-black text-slate-400">/10</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-slate-950">
              <TrendingDown size={10} />
              {painStatus}
            </div>
          </div>

          <div className="h-[170px] min-w-0 rounded-3xl border border-slate-100 bg-white/45 p-2 dark:border-white/5 dark:bg-white/[0.03]">
            {!hasPainRecords ? (
              <div className="flex h-full flex-col justify-between rounded-[1.35rem] border border-dashed border-sky-200/80 bg-sky-50/70 p-3 text-center dark:border-sky-400/20 dark:bg-sky-400/5">
                <div className="grid grid-cols-7 gap-1">
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-white text-[9px] font-black text-sky-700 shadow-sm dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-200">
                        {day.slice(0, 1)}
                      </span>
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400">
                        {day}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mx-auto max-w-[260px] space-y-2">
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    Registre sua dor diariamente
                  </p>
                  <p className="text-[11px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">
                    Assim o FisioCareHub monta sua evolução semanal completa de segunda a domingo.
                  </p>
                  <a
                    href="/diario"
                    className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-700"
                  >
                    Registrar dor
                  </a>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayPainData} margin={{ top: 12, right: 12, left: 6, bottom: 8 }}>
                  <defs>
                    <linearGradient id="painPremiumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.38} />
                      <stop offset="48%" stopColor="#38bdf8" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                    interval={0}
                    minTickGap={0}
                    padding={{ left: 4, right: 4 }}
                    dy={8}
                  />
                  <YAxis hide domain={[0, 10]} />
                  <Area
                    type="monotone"
                    dataKey="level"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fill="url(#painPremiumGradient)"
                    connectNulls
                    dot={{ r: 4, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 3 }}
                    activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 3 }}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>

      {/* Adesão aos exercícios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(16,185,129,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-2xl sm:p-5"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-500 shadow-inner dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <CheckCircle2 size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-500">Adesão</p>
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Treinos concluídos</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Resumo semanal do paciente</p>
            </div>
          </div>

          <div className="inline-flex max-w-[128px] shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[8px] font-black uppercase leading-tight tracking-widest text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 sm:max-w-none sm:text-[9px]">
            <Sparkles size={11} />
            <span>{adherenceStatus}</span>
          </div>
        </div>

        <div className="relative z-10 mt-5 space-y-4 sm:grid sm:grid-cols-[132px_1fr] sm:items-center sm:gap-4 sm:space-y-0">
          <div className="relative mx-auto h-32 w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="adherenceRingGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="55%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(100, 116, 139, 0.24)"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#adherenceRingGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
              <span className="text-3xl font-black leading-none tracking-tight text-slate-950 dark:text-white">{safeAdherence}%</span>
              <span className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">adesão</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-3xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Total da semana</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {totalCompleted} de {totalExercises}
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">exercícios realizados</p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-7 gap-1.5">
                {displayExerciseData.map((item) => {
                  const total = getNumber(item?.total, 0);
                  const completed = getNumber(item?.completed, 0);
                  const percent = total > 0 ? clamp((completed / Math.max(total, 1)) * 100, 0, 100) : 0;
                  const height = total > 0 ? clamp((completed / maxDailyTotal) * 100, 22, 100) : 18;
                  const isDone = total > 0 && completed >= total;
                  const hasPartial = total > 0 && completed > 0 && completed < total;

                  return (
                    <div key={item.day} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-14 w-full max-w-[22px] items-end rounded-full border border-slate-300 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-white/10">
                        <div
                          className={cn(
                            'w-full rounded-full transition-all duration-700',
                            isDone && 'bg-emerald-500 dark:bg-emerald-400',
                            hasPartial && 'bg-sky-500 dark:bg-sky-400',
                            total > 0 && completed <= 0 && 'bg-slate-400 dark:bg-slate-500',
                            total <= 0 && 'bg-slate-300 dark:bg-slate-700',
                          )}
                          style={{ height: `${height}%` }}
                          title={`${item.day}: ${completed}/${total}`}
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">{item.day}</span>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isDone ? 'bg-emerald-500' : percent > 0 ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600',
                      )} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
