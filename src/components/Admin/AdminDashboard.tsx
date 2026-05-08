import { useState, useEffect } from 'react';
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
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
  }, []);

  const KPI_CARDS = [
    { 
      label: 'Fisioterapeutas', 
      value: stats.totalPhysios, 
      icon: UserCheck, 
      color: 'blue', 
      trend: `${stats.totalPhysios > 0 ? '+100%' : '0%'}`, 
      isPositive: true,
      description: 'Base total cadastrada'
    },
    { 
      label: 'Novos Pacientes', 
      value: stats.totalPatients, 
      icon: UserPlus, 
      color: 'emerald', 
      trend: `${stats.patientGrowth.toFixed(1)}%`, 
      isPositive: stats.patientGrowth >= 0,
      description: 'Crescimento mensal'
    },
    { 
      label: 'Consultas Hoje', 
      value: stats.appointmentsToday, 
      icon: Calendar, 
      color: 'indigo', 
      trend: '', 
      isPositive: true,
      description: 'Volume operacional'
    },
    { 
      label: 'Faturamento Mensal', 
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      color: 'amber', 
      trend: `${stats.revenueGrowth.toFixed(1)}%`, 
      isPositive: stats.revenueGrowth >= 0,
      description: 'Receita confirmada'
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Real-time Pulse Header */}
      <div className="flex items-center justify-between bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-blue-600/10 blur-3xl rounded-full group-hover:bg-blue-600/20 transition-all duration-1000" />
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <Zap size={32} className="fill-current" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Central de Comando</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">{stats.onlineUsers} Usuários Online agora</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden md:flex items-center gap-12">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Status Sistema</p>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck size={16} />
              Operacional
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Base de Dados</p>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={16} />
              Sincronizado
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
            className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-white/[0.08] transition-all"
          >
            <div className={cn(
              "absolute top-0 right-0 p-6 -mr-6 -mt-6 blur-2xl rounded-full opacity-10 transition-opacity group-hover:opacity-20",
              kpi.color === 'blue' ? 'bg-blue-600' :
              kpi.color === 'emerald' ? 'bg-emerald-600' :
              kpi.color === 'indigo' ? 'bg-indigo-600' : 'bg-amber-600'
            )} />
            
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
                kpi.color === 'blue' ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' :
                kpi.color === 'emerald' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' :
                kpi.color === 'indigo' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-amber-600/10 border-amber-500/20 text-amber-400'
              )}>
                <kpi.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter",
                kpi.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {kpi.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.trend}
              </div>
            </div>

            <div className="relative z-10 space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{loading ? '...' : kpi.value}</h3>
              <p className="text-[10px] font-bold text-slate-600 italic">{kpi.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-black text-white tracking-tight uppercase">Performance Financeira</h4>
              <p className="text-xs text-slate-500 font-bold">Distribuição de receita por dia da semana</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => `R$ ${val}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '1rem',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-black text-white tracking-tight uppercase">Atividade Recente</h4>
              <p className="text-xs text-slate-500 font-bold">Resumo das últimas interações críticas</p>
            </div>
            <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
              Ver completo
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {recentActivities.map((activity, i) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-110",
                  activity.tipo_acao === 'erro_sistema' || activity.tipo_acao === 'acao_suspicia' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  activity.tipo_acao === 'admin_action' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  activity.tipo_acao === 'pagamento_realizado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-500'
                )}>
                  {activity.tipo_acao === 'erro_sistema' ? <AlertCircle size={18} /> : 
                   activity.tipo_acao === 'pagamento_realizado' ? <DollarSign size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-black text-white truncate pr-2 tracking-tight">{activity.descricao}</p>
                    <span className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">ID: {activity.usuario_id.split('-')[0]}...</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-center text-slate-500 text-xs py-10 font-bold uppercase tracking-widest leading-loose">
                Sem atividades recentes no radar.
              </p>
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-blue-400">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white">{recentActivities.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Ações recentes</p>
              </div>
            </div>
            <div className="flex -space-x-3 opacity-20">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0B1120]" />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
