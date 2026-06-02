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

const EMPTY_PAIN_DATA = [
  { day: 'Seg', level: 0 },
  { day: 'Ter', level: 0 },
  { day: 'Qua', level: 0 },
  { day: 'Qui', level: 0 },
  { day: 'Sex', level: 0 },
  { day: 'Sáb', level: 0 },
  { day: 'Dom', level: 0 },
];

const EMPTY_EXERCISE_DATA = [
  { day: 'Seg', completed: 0, total: 0 },
  { day: 'Ter', completed: 0, total: 0 },
  { day: 'Qua', completed: 0, total: 0 },
  { day: 'Qui', completed: 0, total: 0 },
  { day: 'Sex', completed: 0, total: 0 },
  { day: 'Sáb', completed: 0, total: 0 },
  { day: 'Dom', completed: 0, total: 0 },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function EvolutionCharts({
  painData = [],
  exerciseData = [],
  melhora = 0,
  className,
}: EvolutionChartsProps) {
  const displayPainData = painData.length > 0 ? painData : EMPTY_PAIN_DATA;
  const displayExerciseData = exerciseData.length > 0 ? exerciseData : EMPTY_EXERCISE_DATA;

  const currentPain = clamp(
    getNumber(displayPainData[displayPainData.length - 1]?.level, 0),
    0,
    10,
  );

  const initialPain = clamp(getNumber(displayPainData[0]?.level, currentPain), 0, 10);
  const calculatedImprovement = initialPain > 0
    ? Math.round(((initialPain - currentPain) / initialPain) * 100)
    : melhora;
  const improvement = clamp(getNumber(melhora || calculatedImprovement, 0), 0, 100);

  const totalCompleted = displayExerciseData.reduce((acc, item) => acc + getNumber(item?.completed, 0), 0);
  const totalExercises = displayExerciseData.reduce((acc, item) => acc + getNumber(item?.total, 0), 0);
  const adherencePercent = totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;
  const safeAdherence = clamp(adherencePercent, 0, 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference - (safeAdherence / 100) * circumference;
  const maxDailyTotal = Math.max(1, ...displayExerciseData.map((item) => getNumber(item?.total, 0)));

  const painStatus = currentPain <= 2 ? 'Controle excelente' : currentPain <= 5 ? 'Acompanhar evolução' : 'Atenção clínica';
  const adherenceStatus = safeAdherence >= 85 ? 'Excelente' : safeAdherence >= 50 ? 'Em evolução' : 'Precisa de estímulo';

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {/* Evolução da dor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-sky-200/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(59,130,246,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-500 shadow-inner dark:border-sky-400/20 dark:bg-sky-400/10">
              <Activity size={19} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-500">Dor</p>
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Evolução premium</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Escala clínica de 0 a 10</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="text-xl font-black leading-none text-emerald-500">{improvement}%</p>
            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-500">melhora</p>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-[auto_1fr] items-end gap-4">
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

          <div className="h-[155px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayPainData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
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
                  dy={8}
                />
                <YAxis hide domain={[0, 10]} />
                <Area
                  type="monotone"
                  dataKey="level"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  fill="url(#painPremiumGradient)"
                  dot={{ r: 4, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 3 }}
                  activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 3 }}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Adesão aos exercícios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(16,185,129,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-500 shadow-inner dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <CheckCircle2 size={19} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-500">Adesão</p>
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Treinos concluídos</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Resumo semanal do paciente</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <Sparkles size={11} />
            {adherenceStatus}
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-[132px_1fr] items-center gap-4">
          <div className="relative mx-auto h-32 w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.22)"
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
              <defs>
                <linearGradient id="adherenceRingGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="55%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
              <span className="text-3xl font-black leading-none tracking-tight text-slate-950 dark:text-white">{safeAdherence}%</span>
              <span className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">adesão</span>
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

            <div className="mt-4 flex h-20 items-end justify-between gap-1.5 rounded-3xl border border-slate-200 bg-white/60 px-3 pb-3 pt-4 dark:border-white/10 dark:bg-white/5">
              {displayExerciseData.map((item) => {
                const total = getNumber(item?.total, 0);
                const completed = getNumber(item?.completed, 0);
                const height = total > 0 ? clamp((completed / maxDailyTotal) * 100, 10, 100) : 8;
                const isDone = total > 0 && completed >= total;

                return (
                  <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <div className="flex h-full w-full max-w-[14px] items-end rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={cn(
                          'w-full rounded-full transition-all duration-700',
                          isDone
                            ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                            : 'bg-gradient-to-t from-sky-500 to-violet-500',
                          total <= 0 && 'from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600',
                        )}
                        style={{ height: `${height}%` }}
                        title={`${item.day}: ${completed}/${total}`}
                      />
                    </div>
                    <span className="truncate text-[9px] font-black text-slate-400">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
