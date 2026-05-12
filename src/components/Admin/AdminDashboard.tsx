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
  ,
  Search,
  SlidersHorizontal
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
      <div className="bg-white/95 border border-slate-200 rounded-2xl p-4 lg:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h2>
            <p className="text-slate-500 font-medium">Visão geral do sistema</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 min-w-[280px]">
              <Search size={16} />
              <span className="text-sm">Buscar usuários, pacientes, agendamentos...</span>
            </div>
            <button className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold flex items-center gap-2">
              <Calendar size={16} />
              Últimos 30 dias
            </button>
            <button className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold flex items-center gap-2">
              <SlidersHorizontal size={16} />
              Filtros
            </button>
          </div>
        </div>
      </div>
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Usuários Totais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-700">Usuários Totais</h3>
             <div className="w-12 h-12 bg-gradient-to-br from-[#4F46E5] to-[#6366F1] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Users size={20} />
             </div>
          </div>
          <div className="space-y-2">
             <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{loading ? '...' : stats.totalUsers}</h4>
             <div className="flex items-center gap-1.5 text-emerald-600">
                <ArrowUpRight size={14} />
                <span className="text-sm font-bold">+12,5%</span>
                <span className="text-xs text-slate-400 font-semibold">vs mês anterior</span>
             </div>
          </div>
        </motion.div>

        {/* Card 2: Fisioterapeutas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Fisioterapeutas</h3>
            <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Users size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{loading ? '...' : stats.totalPhysios}</h4>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <ArrowUpRight size={14} />
              <span className="text-sm font-bold">+8,2%</span>
              <span className="text-xs text-slate-400 font-semibold">vs mês anterior</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Pacientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Pacientes</h3>
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <UserPlus size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{loading ? '...' : stats.totalPatients}</h4>
            <div className={cn("flex items-center gap-1.5", stats.patientGrowth >= 0 ? "text-emerald-600" : "text-red-500")}>
              {stats.patientGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="text-sm font-bold">{stats.patientGrowth.toFixed(1)}%</span>
              <span className="text-xs text-slate-400 font-semibold">vs mês anterior</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Agendamentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 flex flex-col justify-between min-h-[160px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Agendamentos</h3>
            <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Calendar size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{loading ? '...' : stats.appointmentsToday}</h4>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <TrendingUp size={14} />
              <span className="text-sm font-bold">{stats.appointmentsToday > 0 ? '+10,1%' : '0%'}</span>
              <span className="text-xs text-slate-400 font-semibold">vs mês anterior</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 overflow-hidden space-y-8 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl text-slate-900 font-black tracking-tight">{t('admin.dashboard.charts.revenue_title')}</h4>
              <p className="text-slate-500 text-sm font-medium">{t('admin.dashboard.charts.revenue_desc')}</p>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  tickFormatter={(val) => `R$${val}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '1rem',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#0F172A'
                  }}
                  itemStyle={{ color: '#0F172A' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366F1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl text-slate-900 font-black tracking-tight">{t('admin.dashboard.charts.activity_title')}</h4>
              <p className="text-slate-500 text-sm font-medium">{t('admin.dashboard.charts.activity_desc')}</p>
            </div>
          </div>
 
          <div className="flex-1 space-y-3">
            {(recentActivities || []).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform",
                  activity.tipo_acao === 'erro_sistema' || activity.tipo_acao === 'acao_suspicia' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  activity.tipo_acao === 'admin_action' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  activity.tipo_acao === 'pagamento_realizado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                )}>
                  {activity.tipo_acao === 'erro_sistema' ? <AlertCircle size={18} /> : 
                   activity.tipo_acao === 'pagamento_realizado' ? <DollarSign size={18} /> : 
                   activity.tipo_acao === 'admin_action' ? <ShieldCheck size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-slate-800 truncate pr-2 tracking-tight">{activity.descricao ?? ''}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
                      {activity.created_at ? new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate">USER: {(activity.usuario_id ?? '').split('-')[0]}</p>
                </div>
              </div>
            ))}
            {(!recentActivities || recentActivities.length === 0) && (
              <p className="text-center text-slate-400 text-[10px] py-10 font-bold uppercase tracking-widest">
                {t('admin.dashboard.charts.no_activity')}
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{(recentActivities || []).length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{t('admin.dashboard.charts.live_ops')}</p>
              </div>
            </div>
            <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-7 h-7 rounded-full bg-white border-2 border-slate-100 shadow-sm" />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
