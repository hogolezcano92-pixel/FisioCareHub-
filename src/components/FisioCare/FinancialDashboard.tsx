import React, { useState, useEffect } from 'react';
import { TrendingUp, Wallet, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, Loader2, Settings, BarChart2, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProfessionalServices } from './ProfessionalServices';

export const FinancialDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'services'>('stats');

  useEffect(() => {
    const handleOpenServices = () => setActiveTab('services');
    window.addEventListener('open-financial-services', handleOpenServices);
    return () => window.removeEventListener('open-financial-services', handleOpenServices);
  }, []);

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
        // Real financial data based on completed appointments
        const { data: appts, error } = await supabase
          .from('agendamentos')
          .select('id, status, data_servico, valor, valor_cobrado')
          .eq('fisio_id', profile.id)
          .eq('status', 'concluido');

        if (error) throw error;

        // Calculate real earnings (using valor_cobrado with fallback to valor)
        const totalEarnings = appts?.reduce((acc, curr) => acc + (Number(curr.valor_cobrado || curr.valor) || 0), 0) || 0;
        
        // Filter for current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyAppts = appts?.filter(a => new Date(a.data_servico) >= firstDayOfMonth) || [];
        const monthlyEarnings = monthlyAppts.reduce((acc, curr) => acc + (Number(curr.valor_cobrado || curr.valor) || 0), 0);

        // Calculate forecast (pending or confirmed appointments)
        const { data: pendingAppts } = await supabase
          .from('agendamentos')
          .select('valor, valor_cobrado')
          .eq('fisio_id', profile.id)
          .in('status', ['pendente', 'confirmado']);
        
        const forecast = pendingAppts?.reduce((acc, curr) => acc + (Number(curr.valor_cobrado || curr.valor) || 0), 0) || 0;

        setFinancialStats({
          balance: totalEarnings, 
          monthlyEarnings: monthlyEarnings,
          forecast: forecast,
          growth: 0 // Real growth calculation would require previous month data
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
    { label: 'Saldo Disponível', value: `R$ ${financialStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'bg-[#0047AB] shadow-blue-900/20' },
    { label: 'Ganhos do Mês', value: `R$ ${financialStats.monthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-emerald-600 shadow-emerald-900/20' },
    { label: 'Previsão de Recebimento', value: `R$ ${financialStats.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: 'bg-amber-600 shadow-amber-900/20' },
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
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
        <button 
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'stats' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/10" : "text-slate-500 hover:text-white"
          )}
        >
          <BarChart2 size={14} />
          Estatísticas
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'services' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/10" : "text-slate-500 hover:text-white"
          )}
        >
          <DollarSign size={14} />
          Serviços e Preços
        </button>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-5 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/50 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-2xl space-y-2.5 group hover:shadow-md transition-all"
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-black text-[8px] uppercase tracking-widest">{stat.label}</p>
                  <h4 className="text-base font-black text-white tracking-tight">{stat.value}</h4>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[8px] font-black">
                  <ArrowUpRight size={9} />
                  +{financialStats.growth}%
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                    <Calendar className="text-blue-400" size={18} />
                    Atendimentos
                  </h3>
                  <p className="text-slate-400 text-[9px] font-medium">Produtividade semanal.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveTab('services')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Settings size={12} />
                    Configurar Custos e Serviços
                  </button>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 self-start">
                    <button className="px-2 py-0.5 bg-white/10 text-white rounded-lg font-black text-[8px] shadow-sm border border-white/5">Semana</button>
                    <button className="px-2 py-0.5 text-slate-500 font-black text-[8px] hover:text-white transition-all">Mês</button>
                  </div>
                </div>
              </div>

            <div className="flex items-end justify-between gap-2 h-40 pt-4">
              {weeklyData.map((data, i) => (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2.5 group">
                  <div className="relative w-full flex justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: data.height.replace('h-', '') + 'px' }}
                      transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                      className={cn(
                        "w-full max-w-[28px] rounded-t-lg transition-all group-hover:brightness-110",
                        i === 4 ? "bg-blue-600 shadow-lg shadow-blue-900/20" : "bg-white/5"
                      )}
                    />
                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap border border-white/5">
                      {data.count} atend.
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{data.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProfessionalServices />
        </div>
      )}
    </div>
  );
};
