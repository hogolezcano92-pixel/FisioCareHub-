import { useState, useEffect } from 'react';
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
import { motion } from 'motion/react';
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

  const KPI_CARDS = [
    { 
      label: t('admin.dashboard.kpi.physios', 'Fisioterapeutas'), 
      value: stats.totalPhysios, 
      icon: UserCheck, 
      color: 'blue', 
      trend: `${stats.totalPhysios > 0 ? '+100%' : '0%'}`, 
      isPositive: true,
      description: t('admin.dashboard.kpi.physios_desc', 'Base total cadastrada')
    },
    { 
      label: t('admin.dashboard.kpi.patients', 'Novos Pacientes'), 
      value: stats.totalPatients, 
      icon: UserPlus, 
      color: 'emerald', 
      trend: `${stats.patientGrowth.toFixed(1)}%`, 
      isPositive: stats.patientGrowth >= 0,
      description: t('admin.dashboard.kpi.patients_desc', 'Crescimento mensal')
    },
    { 
      label: t('admin.dashboard.kpi.appointments', 'Consultas Hoje'), 
      value: stats.appointmentsToday, 
      icon: Calendar, 
      color: 'indigo', 
      trend: '', 
      isPositive: true,
      description: t('admin.dashboard.kpi.appointments_desc', 'Volume operacional')
    },
    { 
      label: t('admin.dashboard.kpi.revenue', 'Faturamento Mensal'), 
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      color: 'amber', 
      trend: `${stats.revenueGrowth.toFixed(1)}%`, 
      isPositive: stats.revenueGrowth >= 0,
      description: t('admin.dashboard.kpi.revenue_desc', 'Receita confirmada')
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* SaaS Style Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-blue-50 blur-3xl rounded-full group-hover:bg-blue-100 transition-all duration-1000" />
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap size={28} className="text-white fill-current" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin.dashboard.command_center', 'Command Center')}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{stats.onlineUsers} {t('admin.dashboard.active_sessions', 'Active Sessions')}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-12 mt-6 md:mt-0">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('admin.dashboard.system_health', 'System Health')}</p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <ShieldCheck size={16} />
              {t('admin.dashboard.operational', 'Operational')}
            </div>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('admin.dashboard.network', 'Network')}</p>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <CheckCircle2 size={16} />
              {t('admin.dashboard.synchronized', 'Synchronized')}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_CARDS.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="admin-card p-6 relative overflow-hidden group"
          >
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110",
                kpi.color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                kpi.color === 'emerald' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                kpi.color === 'indigo' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-amber-50 border-amber-100 text-amber-600'
              )}>
                <kpi.icon size={22} />
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black tracking-tighter",
                kpi.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {kpi.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {kpi.trend}
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{loading ? '...' : kpi.value}</h3>
              <p className="text-[10px] font-medium text-slate-400 mt-1">{kpi.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card p-8 bg-white overflow-hidden shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg admin-title tracking-tight uppercase">{t('admin.dashboard.charts.revenue_title', 'Revenue Performance')}</h4>
              <p className="admin-text-secondary text-xs font-medium">{t('admin.dashboard.charts.revenue_desc', 'Daily income distribution')}</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `R$${val}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card p-8 bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg admin-title tracking-tight uppercase">{t('admin.dashboard.charts.activity_title', 'Recent Activity')}</h4>
              <p className="admin-text-secondary text-xs font-medium">{t('admin.dashboard.charts.activity_desc', 'Real-time event stream')}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform",
                  activity.tipo_acao === 'erro_sistema' || activity.tipo_acao === 'acao_suspicia' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                  activity.tipo_acao === 'admin_action' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                  activity.tipo_acao === 'pagamento_realizado' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                  'bg-blue-50 border-blue-100 text-blue-600'
                )}>
                  {activity.tipo_acao === 'erro_sistema' ? <AlertCircle size={18} /> : 
                   activity.tipo_acao === 'pagamento_realizado' ? <DollarSign size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate pr-2 tracking-tight">{activity.descricao}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">USER: {activity.usuario_id.split('-')[0]}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-center text-slate-400 text-[10px] py-10 font-bold uppercase tracking-widest">
                {t('admin.dashboard.charts.no_activity', 'No recent activity detected.')}
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-blue-600 shadow-inner">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{recentActivities.length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{t('admin.dashboard.charts.live_ops', 'Live Operations')}</p>
              </div>
            </div>
            <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
