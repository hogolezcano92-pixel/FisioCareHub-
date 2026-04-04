import React from 'react';
import { TrendingUp, Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const FinancialDashboard = () => {
  const stats = [
    { label: 'Saldo Disponível', value: 'R$ 2.450,00', icon: Wallet, color: 'bg-blue-600 shadow-blue-100' },
    { label: 'Ganhos do Mês', value: 'R$ 8.120,00', icon: TrendingUp, color: 'bg-emerald-600 shadow-emerald-100' },
    { label: 'Previsão de Recebimento', value: 'R$ 1.890,00', icon: CreditCard, color: 'bg-amber-600 shadow-amber-100' },
  ];

  const weeklyData = [
    { day: 'Seg', count: 8, height: 'h-32' },
    { day: 'Ter', count: 10, height: 'h-40' },
    { day: 'Qua', count: 6, height: 'h-24' },
    { day: 'Qui', count: 9, height: 'h-36' },
    { day: 'Sex', count: 12, height: 'h-48' },
    { day: 'Sáb', count: 4, height: 'h-16' },
    { day: 'Dom', count: 0, height: 'h-0' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4 group hover:shadow-xl hover:shadow-slate-100 transition-all"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", stat.color)}>
              <stat.icon size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-black text-xs uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-black">
              <ArrowUpRight size={14} />
              +12% em relação ao mês anterior
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Calendar className="text-blue-600" size={32} />
              Atendimentos Realizados
            </h3>
            <p className="text-slate-500 font-medium">Sua produtividade na última semana.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <button className="px-4 py-2 bg-white text-blue-600 rounded-xl font-black text-xs shadow-sm border border-slate-100">Semana</button>
            <button className="px-4 py-2 text-slate-400 font-black text-xs hover:text-slate-600 transition-all">Mês</button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 h-64 pt-8">
          {weeklyData.map((data, i) => (
            <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group">
              <div className="relative w-full flex justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: data.height.replace('h-', '') + 'px' }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "w-full max-w-[40px] rounded-t-2xl transition-all group-hover:brightness-110",
                    i === 4 ? "bg-blue-600 shadow-lg shadow-blue-100" : "bg-slate-200"
                  )}
                />
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                  {data.count} atend.
                </div>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{data.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
