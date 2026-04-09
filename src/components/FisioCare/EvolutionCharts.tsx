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
  className?: string;
}

const DEFAULT_PAIN_DATA = [
  { day: 'Seg', level: 8 },
  { day: 'Ter', level: 7 },
  { day: 'Qua', level: 5 },
  { day: 'Qui', level: 6 },
  { day: 'Sex', level: 4 },
  { day: 'Sáb', level: 3 },
  { day: 'Dom', level: 2 },
];

const DEFAULT_EXERCISE_DATA = [
  { day: 'Seg', completed: 2, total: 5 },
  { day: 'Ter', completed: 4, total: 5 },
  { day: 'Qua', completed: 5, total: 5 },
  { day: 'Qui', completed: 3, total: 5 },
  { day: 'Sex', completed: 5, total: 5 },
  { day: 'Sáb', completed: 4, total: 5 },
  { day: 'Dom', completed: 5, total: 5 },
];

export function EvolutionCharts({ painData = DEFAULT_PAIN_DATA, exerciseData = DEFAULT_EXERCISE_DATA, className }: EvolutionChartsProps) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-8", className)}>
      {/* Pain Evolution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="text-blue-500" size={20} />
              Evolução da Dor
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Escala de 0 a 10</p>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={12} className="rotate-180" />
            Melhora de 75%
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={painData}>
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
        className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} />
              Adesão aos Exercícios
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Concluídos vs Total</p>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest">
            Excelente
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exerciseData}>
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
