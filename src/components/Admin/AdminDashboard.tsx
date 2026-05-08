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
    onlineUsers: 14, // Simulated for dashboard
    appointmentsToday: 0,
    monthlyRevenue: 12450.80,
    revenueGrowth: 12.5,
    patientGrowth: 8.2,
    avgRating: 4.8
  });

  const [revenueData, setRevenueData] = useState([
    { name: 'Seg', value: 4000 },
    { name: 'Ter', value: 3000 },
    { name: 'Qua', value: 2000 },
    { name: 'Qui', value: 2780 },
    { name: 'Sex', value: 1890 },
    { name: 'Sáb', value: 2390 },
    { name: 'Dom', value: 3490 },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [
          { count: profilesCount },
          { count: physiosCount },
          { count: patientsCount },
          { count: appointmentsCount }
        ] = await Promise.all([
          supabase.from('perfis').select('*', { count: 'exact', head: true }),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'fisioterapeuta'),
          supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo_usuario', 'paciente'),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_horario', new Date().toISOString().split('T')[0])
        ]);

        setStats(prev => ({
          ...prev,
          totalUsers: profilesCount || 0,
          totalPhysios: physiosCount || 0,
          totalPatients: patientsCount || 0,
          appointmentsToday: appointmentsCount || 0
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
      trend: '+12%', 
      isPositive: true,
      description: 'Crescimento de base'
    },
    { 
      label: 'Novos Pacientes', 
      value: stats.totalPatients, 
      icon: UserPlus, 
      color: 'emerald', 
      trend: '+5%', 
      isPositive: true,
      description: 'Esta semana'
    },
    { 
      label: 'Consultas Hoje', 
      value: stats.appointmentsToday, 
      icon: Calendar, 
      color: 'indigo', 
      trend: '-2%', 
      isPositive: false,
      description: 'Volume operacional'
    },
    { 
      label: 'Faturamento Mensal', 
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`, 
      icon: DollarSign, 
      color: 'amber', 
      trend: '+24%', 
      isPositive: true,
      description: 'Receita bruta total'
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
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Tempo de Resposta</p>
            <p className="text-sm font-black text-white">48ms</p>
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
            {[
              { label: 'Dr. Ricardo aprovado', time: '2 min atrás', type: 'system', desc: 'Documentação validada por IA' },
              { label: 'Falha de login detectada', time: '15 min atrás', type: 'alert', desc: 'IP 182.23.4.15 (Suspicious)' },
              { label: 'Novo paciente registrado', time: '1 hora atrás', type: 'info', desc: 'Vinculado à Dra. Carol' },
              { label: 'Saque de R$ 560,00 solicitado', time: '3 horas atrás', type: 'finance', desc: 'Pendente revisão admin' }
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-110",
                  activity.type === 'alert' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                  activity.type === 'system' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  activity.type === 'finance' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-500'
                )}>
                  {activity.type === 'alert' ? <AlertCircle size={18} /> : 
                   activity.type === 'finance' ? <DollarSign size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-black text-white truncate pr-2 tracking-tight">{activity.label}</p>
                    <span className="text-[9px] font-black text-slate-500 uppercase whitespace-nowrap">{activity.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">{activity.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-blue-400">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white">425</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Ações hoje</p>
              </div>
            </div>
            <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0B1120] flex items-center justify-center text-[10px] font-black text-white">
                   {String.fromCharCode(64 + i)}
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
