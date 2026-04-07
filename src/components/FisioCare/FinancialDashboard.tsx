import React, { useState, useEffect } from 'react';
import { TrendingUp, Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const FinancialDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [financialStats, setFinancialStats] = useState({
    balance: 0,
    monthlyEarnings: 0,
    forecast: 0,
    growth: 0
  });

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        // Simulating financial data based on appointments
        // In a real app, you'd have a 'transacoes' or 'pagamentos' table
        const { data: appts, error } = await supabase
          .from('agendamentos')
          .select('id, status, data_servico')
          .eq('fisio_id', profile.id)
          .eq('status', 'concluido');

        if (error) throw error;

        // Assuming a fixed price for simulation
        const pricePerSession = 150;
        const totalEarnings = (appts?.length || 0) * pricePerSession;
        
        // Filter for current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyAppts = appts?.filter(a => new Date(a.data_servico) >= firstDayOfMonth) || [];
        const monthlyEarnings = monthlyAppts.length * pricePerSession;

        setFinancialStats({
          balance: totalEarnings * 0.7, // Simulated balance
          monthlyEarnings: monthlyEarnings,
          forecast: (appts?.length || 0) * pricePerSession * 1.2, // Simulated forecast
          growth: 12 // Simulated growth
        });
      } catch (err) {
        console.error("Erro ao carregar dados financeiros:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [profile]);

  const stats = [
    { label: 'Saldo Disponível', value: `R$ ${financialStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'bg-blue-600 shadow-blue-100' },
    { label: 'Ganhos do Mês', value: `R$ ${financialStats.monthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-emerald-600 shadow-emerald-100' },
    { label: 'Previsão de Recebimento', value: `R$ ${financialStats.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: 'bg-amber-600 shadow-amber-100' },
  ];

  const weeklyData = [
    { day: 'Seg', count: 0, height: 'h-0' },
    { day: 'Ter', count: 0, height: 'h-0' },
    { day: 'Qua', count: 0, height: 'h-0' },
    { day: 'Qui', count: 0, height: 'h-0' },
    { day: 'Sex', count: 0, height: 'h-0' },
    { day: 'Sáb', count: 0, height: 'h-0' },
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
              +{financialStats.growth}% em relação ao mês anterior
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
