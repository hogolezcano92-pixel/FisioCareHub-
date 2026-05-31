import React, { useState, useEffect } from 'react';
import { TrendingUp, Wallet, CreditCard, Calendar, ArrowUpRight, Loader2, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const FinancialDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [financialStats, setFinancialStats] = useState({
    balance: 0,
    monthlyEarnings: 0,
    forecast: 0,
    growth: 0,
    commissionRate: 12
  });

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!profile) return;
      setLoading(true);

      const getGrossAmount = (appointment: any) =>
        Number(appointment?.valor_cobrado ?? appointment?.valor ?? appointment?.valor_sessao ?? 0) || 0;

      try {
        // Usa a mesma regra da área financeira do profissional:
        // valor líquido = valor bruto - comissão da plataforma.
        let rate = 12;
        try {
          const { data: settings } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'commission_rate')
            .maybeSingle();

          const parsedRate = Number(settings?.value);
          if (!Number.isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100) {
            rate = parsedRate;
          }
        } catch (settingsError) {
          console.warn('Não foi possível carregar commission_rate. Usando 12%.', settingsError);
        }

        const netFactor = (100 - rate) / 100;
        const getNetAmount = (appointment: any) => getGrossAmount(appointment) * netFactor;

        // Saldo disponível: somente atendimentos concluídos, menos saques já pagos.
        // Isso evita mostrar como saldo valores apenas pagos/confirmados, mas ainda não concluídos.
        const { data: completedAppointments, error: completedError } = await supabase
          .from('agendamentos')
          .select('id, data, data_servico, valor, valor_cobrado, status')
          .eq('fisio_id', profile.id)
          .eq('status', 'concluido')
          .order('data', { ascending: false });

        if (completedError) throw completedError;

        const { data: withdrawals, error: withdrawalsError } = await supabase
          .from('solicitacoes_saque')
          .select('valor')
          .eq('user_id', profile.id)
          .eq('status', 'pago');

        if (withdrawalsError) {
          console.warn('Não foi possível carregar saques pagos:', withdrawalsError);
        }

        const totalCompletedNet = (completedAppointments || []).reduce((acc, curr) => acc + getNetAmount(curr), 0);
        const totalPaidWithdrawals = (withdrawals || []).reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        const availableBalance = Math.max(0, totalCompletedNet - totalPaidWithdrawals);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyEarnings = (completedAppointments || []).reduce((acc, curr) => {
          const rawDate = curr.data || curr.data_servico;
          if (!rawDate) return acc;
          const appointmentDate = new Date(rawDate);
          return appointmentDate >= startOfMonth ? acc + getNetAmount(curr) : acc;
        }, 0);

        // Previsão: agendamentos já pagos/confirmados, mas ainda não concluídos.
        const { data: forecastAppointments, error: forecastError } = await supabase
          .from('agendamentos')
          .select('id, valor, valor_cobrado, status')
          .eq('fisio_id', profile.id)
          .in('status', ['confirmado', 'pago', 'pago_app', 'agendado']);

        if (forecastError) {
          console.warn('Não foi possível carregar previsão de recebimento:', forecastError);
        }

        const forecast = (forecastAppointments || []).reduce((acc, curr) => acc + getNetAmount(curr), 0);

        setFinancialStats({
          balance: availableBalance,
          monthlyEarnings,
          forecast,
          growth: 0,
          commissionRate: rate
        });

        // Produtividade semanal baseada nos atendimentos concluídos.
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekCounts = new Array(7).fill(0);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        (completedAppointments || []).forEach((appointment) => {
          const rawDate = appointment.data || appointment.data_servico;
          if (!rawDate) return;
          const date = new Date(rawDate);
          if (date >= oneWeekAgo) {
            weekCounts[date.getDay()]++;
          }
        });

        const maxCount = Math.max(...weekCounts, 1);
        const transformedWeeklyData = weekDays.map((day, i) => ({
          day,
          count: weekCounts[i],
          height: `h-${Math.round((weekCounts[i] / maxCount) * 100)}`
        }));

        setWeeklyData(transformedWeeklyData);
      } catch (err) {
        console.error("Erro ao carregar dados financeiros:", err);
        toast.error('Não foi possível carregar os dados financeiros do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [profile]);

  const [weeklyData, setWeeklyData] = useState([
    { day: 'Seg', count: 0, height: 'h-0' },
    { day: 'Ter', count: 0, height: 'h-0' },
    { day: 'Qua', count: 0, height: 'h-0' },
    { day: 'Qui', count: 0, height: 'h-0' },
    { day: 'Sex', count: 0, height: 'h-0' },
    { day: 'Sáb', count: 0, height: 'h-0' },
    { day: 'Dom', count: 0, height: 'h-0' },
  ]);

  const stats = [
    { label: 'Saldo Disponível', value: `R$ ${financialStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'bg-[#0047AB] shadow-blue-900/20' },
    { label: 'Ganhos do Mês', value: `R$ ${financialStats.monthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-emerald-600 shadow-emerald-900/20' },
    { label: 'Previsão de Recebimento', value: `R$ ${financialStats.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: 'bg-amber-600 shadow-amber-900/20' },
  ];

  const weeklyBarColors = [
    'bg-gradient-to-t from-sky-500 to-cyan-300 shadow-sky-900/30',
    'bg-gradient-to-t from-violet-500 to-purple-300 shadow-violet-900/30',
    'bg-gradient-to-t from-emerald-500 to-green-300 shadow-emerald-900/30',
    'bg-gradient-to-t from-amber-500 to-orange-300 shadow-amber-900/30',
    'bg-gradient-to-t from-rose-500 to-pink-300 shadow-rose-900/30',
    'bg-gradient-to-t from-indigo-500 to-blue-300 shadow-indigo-900/30',
    'bg-gradient-to-t from-teal-500 to-cyan-300 shadow-teal-900/30',
  ];

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Loader2 size={12} className="animate-spin" />
          Atualizando financeiro...
        </div>
      )}
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
                    onClick={() => navigate('/finance/settings')}
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
                        "w-full max-w-[28px] rounded-t-lg shadow-lg transition-all group-hover:brightness-110 group-hover:scale-105",
                        data.count > 0 ? weeklyBarColors[i % weeklyBarColors.length] : "bg-white/5 shadow-none"
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
      </div>
  );
};
