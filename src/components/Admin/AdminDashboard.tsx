import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalPhysios: number;
  totalPatients: number;
  onlineUsers: number;
  appointmentsToday: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  patientGrowth: number;
  avgRating: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPhysios: 0,
    totalPatients: 0,
    onlineUsers: 0,
    appointmentsToday: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    patientGrowth: 0,
    avgRating: 0
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const [
          { count: profilesCount },
          { count: physiosCount },
          { count: patientsCount },
          { count: appointmentsCount },
          { data: revenueThisMonth },
          { data: revenueLastMonth },
          { data: weekRevenue },
          { data: lastActivities },
          { count: newPatientsThisMonth },
          { count: newPatientsLastMonth },
          { count: activeNowCount },
          { data: ratingsData }
        ] = await Promise.all([
          supabase.from('perfis').select('*', { count: 'exact', head: true }),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'fisioterapeuta'),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'paciente'),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_horario', today.toISOString()),
          supabase.from('agendamentos').select('valor_cobrado').gte('data_horario', firstDayOfMonth).eq('status', 'concluido'),
          supabase.from('agendamentos').select('valor_cobrado').gte('data_horario', firstDayOfLastMonth).lt('data_horario', firstDayOfMonth).eq('status', 'concluido'),
          supabase.from('agendamentos').select('data_horario, valor_cobrado').gte('data_horario', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()).eq('status', 'concluido'),
          supabase.from('historico_atividades').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'paciente').gte('created_at', firstDayOfMonth),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'paciente').gte('created_at', firstDayOfLastMonth).lt('created_at', firstDayOfMonth),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).gte('last_active_at', fiveMinutesAgo),
          supabase.from('avaliacoes').select('estrelas')
        ]);

        const totalRevenueThisMonth = (revenueThisMonth || []).reduce((acc, curr) => acc + (Number(curr.valor_cobrado) || 0), 0);
        const totalRevenueLastMonth = (revenueLastMonth || []).reduce((acc, curr) => acc + (Number(curr.valor_cobrado) || 0), 0);
        
        const revGrowth = totalRevenueLastMonth > 0 
          ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100 
          : 0;

        const patGrowth = (newPatientsLastMonth || 0) > 0
          ? (((newPatientsThisMonth || 0) - (newPatientsLastMonth || 0)) / (newPatientsLastMonth || 0)) * 100
          : 0;

        const avg = ratingsData && ratingsData.length > 0
          ? ratingsData.reduce((acc, curr) => acc + curr.estrelas, 0) / ratingsData.length
          : 0;

        // Process revenue for chart
        const days = [
          t('common.days_short.sun', 'Dom'),
          t('common.days_short.mon', 'Seg'),
          t('common.days_short.tue', 'Ter'),
          t('common.days_short.wed', 'Qua'),
          t('common.days_short.thu', 'Qui'),
          t('common.days_short.fri', 'Sex'),
          t('common.days_short.sat', 'Sáb')
        ];
        const chartData = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
          const dayName = days[d.getDay()];
          const value = (weekRevenue || [])
            .filter(r => new Date(r.data_horario).toDateString() === d.toDateString())
            .reduce((acc, curr) => acc + (Number(curr.valor_cobrado) || 0), 0);
          return { name: dayName, value };
        });

        setRevenueData(chartData);
        setRecentActivities(lastActivities || []);
        setStats(prev => ({
          ...prev,
          totalUsers: profilesCount || 0,
          totalPhysios: physiosCount || 0,
          totalPatients: patientsCount || 0,
          appointmentsToday: appointmentsCount || 0,
          monthlyRevenue: totalRevenueThisMonth,
          revenueGrowth: revGrowth,
          patientGrowth: patGrowth,
          onlineUsers: activeNowCount || 0,
          avgRating: avg
        }));
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [t]);

  const KPI_CARDS = useMemo(() => [
    { 
      label: t('admin.dashboard.kpi.physios'), 
      value: stats.totalPhysios, 
      icon: UserCheck, 
      color: 'blue' as const, 
      trend: `${stats.totalPhysios > 0 ? '+100%' : '0%'}`, 
      isPositive: true,
      description: t('admin.dashboard.kpi.physios_desc')
    },
    { 
      label: t('admin.dashboard.kpi.patients'), 
      value: stats.totalPatients, 
      icon: UserPlus, 
      color: 'emerald' as const, 
      trend: `${stats.patientGrowth.toFixed(1)}%`, 
      isPositive: stats.patientGrowth >= 0,
      description: t('admin.dashboard.kpi.patients_desc')
    },
    { 
      label: t('admin.dashboard.kpi.appointments'), 
      value: stats.appointmentsToday, 
      icon: Calendar, 
      color: 'indigo' as const, 
      trend: '', 
      isPositive: true,
      description: t('admin.dashboard.kpi.appointments_desc')
    },
    { 
      label: t('admin.dashboard.kpi.revenue'), 
      value: `R$ ${(stats.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      color: 'amber' as const, 
      trend: `${stats.revenueGrowth.toFixed(1)}%`, 
      isPositive: stats.revenueGrowth >= 0,
      description: t('admin.dashboard.kpi.revenue_desc')
    }
  ], [stats, t]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700">
      {/* KPI Grid - Replaced with High Fidelity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Centro de Comando */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 flex flex-col justify-between min-h-[160px] group relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center justify-between mb-4">
             <h3 className="text-[11px] font-black text-[#7B2CBF] uppercase tracking-widest">Centro de Comando</h3>
             <div className="w-10 h-10 bg-[#7B2CBF]/10 rounded-full flex items-center justify-center text-[#7B2CBF]">
                <Zap size={20} className="fill-current" />
             </div>
          </div>
          <div className="relative z-10 space-y-1">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7B2CBF] animate-pulse" />
                <span className="text-[10px] font-bold text-[#7B2CBF] tracking-wider">0 SESSÕES ATIVAS</span>
             </div>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Monitoramento em Tempo Real</p>
          </div>
          {/* Decorative floating icon */}
          <Zap size={80} className="absolute -bottom-6 -right-6 text-[#7B2CBF]/5 rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-700" />
        </motion.div>

        {/* Card 2: Fisioterapeutas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[24px] shadow-xl border border-gray-100 overflow-hidden flex flex-col group"
        >
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-[#7B2CBF] uppercase tracking-widest">FISIOTERAPEUTAS</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-[#3A86FF] to-[#7B2CBF] rounded-full flex items-center justify-center text-white">
                <Users size={18} />
              </div>
            </div>
            <div className="flex flex-col">
              <h4 className="text-5xl font-black text-[#0A1931] tracking-tighter leading-none mb-1">{loading ? '...' : stats.totalPhysios}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Base total cadastrada</p>
            </div>
          </div>
          <div className="h-10 bg-gradient-to-r from-[#3A86FF] to-[#7B2CBF] flex items-center px-6">
             <div className="flex items-center gap-1.5 text-white">
                <ArrowUpRight size={14} className="font-black" />
                <span className="text-[11px] font-black">+100%</span>
             </div>
          </div>
        </motion.div>

        {/* Card 3: Novos Pacientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] shadow-xl border border-gray-100 overflow-hidden flex flex-col group"
        >
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-[#7B2CBF] uppercase tracking-widest">NOVOS PACIENTES</h3>
              <div className="w-10 h-10 bg-[#0A1931]/5 border border-gray-100 rounded-full flex items-center justify-center text-[#3A86FF]">
                <UserPlus size={18} />
              </div>
            </div>
            <div className="flex flex-col">
              <h4 className="text-5xl font-black text-[#0A1931] tracking-tighter leading-none mb-1">{loading ? '...' : stats.totalPatients}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Crescimento mensal</p>
            </div>
          </div>
          <div className="h-10 bg-[#0A1931] flex items-center px-6 border-b-4 border-[#7B2CBF]">
             <div className="flex items-center gap-1.5 text-[#7B2CBF]">
                <TrendingDown size={14} className="font-black" />
                <span className="text-[11px] font-black text-white/90">↓ {stats.patientGrowth.toFixed(1)}%</span>
             </div>
          </div>
        </motion.div>

        {/* Card 4: Consultas Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[24px] shadow-xl border border-gray-100 overflow-hidden flex flex-col group relative"
        >
          <button className="absolute top-4 right-4 w-8 h-8 bg-[#F8F9FF] text-[#7B2CBF] rounded-lg flex items-center justify-center hover:bg-[#7B2CBF] hover:text-white transition-all z-20">
            <ArrowUpRight size={16} />
          </button>
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-[#7B2CBF] uppercase tracking-widest">CONSULTAS HOJE</h3>
              <div className="w-10 h-10 bg-[#F8F9FF] rounded-full flex items-center justify-center text-[#7B2CBF]">
                <Calendar size={18} />
              </div>
            </div>
            <div className="flex flex-col">
              <h4 className="text-5xl font-black text-[#0A1931] tracking-tighter leading-none mb-1">{loading ? '...' : stats.appointmentsToday}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Volume operacional</p>
            </div>
          </div>
          <div className="h-10 bg-gradient-to-r from-[#7B2CBF] to-[#5A189A] flex items-center px-6">
             <div className="flex items-center gap-1.5 text-white">
                <TrendingUp size={14} className="font-black" />
                <span className="text-[11px] font-black">↑ {stats.appointmentsToday > 0 ? '+12.5%' : 'N/A'}</span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--surface)] border border-[var(--border)] shadow-sm rounded-[var(--radius)] p-8 overflow-hidden space-y-8 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg text-[var(--text)] font-black tracking-tight uppercase">{t('admin.dashboard.charts.revenue_title')}</h4>
              <p className="text-[var(--text-2)] text-xs font-medium">{t('admin.dashboard.charts.revenue_desc')}</p>
            </div>
          </div>
 
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-2)', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-2)', fontSize: 10 }}
                  tickFormatter={(val) => `R$${val}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '1rem',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: 'var(--text)'
                  }}
                  itemStyle={{ color: 'var(--text)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        <div className="bg-[var(--surface)] border border-[var(--border)] shadow-sm rounded-[var(--radius)] p-8 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg text-[var(--text)] font-black tracking-tight uppercase">{t('admin.dashboard.charts.activity_title')}</h4>
              <p className="text-[var(--text-2)] text-xs font-medium">{t('admin.dashboard.charts.activity_desc')}</p>
            </div>
          </div>
 
          <div className="flex-1 space-y-3">
            {(recentActivities || []).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg)] transition-all border border-transparent hover:border-[var(--border)] group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform",
                  activity.tipo_acao === 'erro_sistema' || activity.tipo_acao === 'acao_suspicia' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  activity.tipo_acao === 'admin_action' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  activity.tipo_acao === 'pagamento_realizado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]'
                )}>
                  {activity.tipo_acao === 'erro_sistema' ? <AlertCircle size={18} /> : 
                   activity.tipo_acao === 'pagamento_realizado' ? <DollarSign size={18} /> : 
                   activity.tipo_acao === 'admin_action' ? <ShieldCheck size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-[var(--text)] truncate pr-2 tracking-tight">{activity.descricao ?? ''}</p>
                    <span className="text-[9px] font-black text-[var(--text-2)] uppercase whitespace-nowrap">
                      {activity.created_at ? new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-2)] font-medium truncate">USER: {(activity.usuario_id ?? '').split('-')[0]}</p>
                </div>
              </div>
            ))}
            {(!recentActivities || recentActivities.length === 0) && (
              <p className="text-center text-[var(--text-2)] text-[10px] py-10 font-bold uppercase tracking-widest">
                {t('admin.dashboard.charts.no_activity')}
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-[var(--text)]">{(recentActivities || []).length}</p>
                <p className="text-[9px] font-bold text-[var(--text-2)] uppercase">{t('admin.dashboard.charts.live_ops')}</p>
              </div>
            </div>
            <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-7 h-7 rounded-full bg-[var(--surface)] border-2 border-[var(--bg)] shadow-sm" />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
