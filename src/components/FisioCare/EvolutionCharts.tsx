import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
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

export function EvolutionCharts({ 
  painData = [], 
  exerciseData = [], 
  melhora = 0,
  className 
}: EvolutionChartsProps) {
  const displayPainData = painData.length > 0 ? painData : EMPTY_PAIN_DATA;
  const displayExerciseData = exerciseData.length > 0 ? exerciseData : EMPTY_EXERCISE_DATA;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-8", className)}>
      {/* Pain Evolution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="text-blue-500" size={20} />
              Evolução da Dor
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Escala de 0 a 10</p>
          </div>
          {melhora > 0 && (
            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1">
              <TrendingUp size={12} className="rotate-180" />
              Melhora de {melhora}%
            </div>
          )}
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayPainData}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                domain={[0, 10]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
                itemStyle={{ color: '#3b82f6', fontWeight: 800 }}
              />
              <Area 
                type="monotone" 
                dataKey="level" 
                stroke="#3b82f6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorLevel)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Exercise Completion Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} />
              Adesão aos Exercícios
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Concluídos vs Total</p>
          </div>
          {exerciseData.length > 0 && (
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest">
              Excelente
            </div>
          )}
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayExerciseData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
              />
              <Bar 
                dataKey="completed" 
                fill="#10b981" 
                radius={[6, 6, 0, 0]} 
                barSize={20}
                animationDuration={1500}
              />
              <Bar 
                dataKey="total" 
                fill="#e2e8f0" 
                radius={[6, 6, 0, 0]} 
                barSize={20}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
