import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { 
  Calendar, 
  Users, 
  FileText, 
  Activity, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Plus,
  Check,
  MessageSquare,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Lock,
  Video,
  Loader2,
  Crown,
  Route,
  BookOpen,
  Wallet,
  User,
  MapPin,
  Thermometer,
  AlertTriangle
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

// New FisioCare Components
import { PainDiary, ExerciseChecklist } from '../components/FisioCare/PatientCare';
import { SOAPIntelligentRecord } from '../components/FisioCare/SOAPRecord';
import { RouteOptimizer } from '../components/FisioCare/RouteOptimizer';
import { FinancialDashboard } from '../components/FisioCare/FinancialDashboard';
import { DigitalLibrary } from '../components/FisioCare/DigitalLibrary';
import { EvolutionCharts } from '../components/FisioCare/EvolutionCharts';
import ProGuard from '../components/ProGuard';
import { Trophy, Medal, Star, Zap } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, subscription, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    records: 0,
    pendingTriages: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentTriages, setRecentTriages] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const lastLoadedProfileId = useRef<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planId = searchParams.get('plan_id');
    
    if (sessionId && planId === 'pro') {
      toast.success('Assinatura Pro Ativada!', {
        description: 'Parabéns! Você agora tem acesso a todos os recursos avançados.'
      });
      refreshProfile();
      // Limpar os parâmetros da URL para não repetir o toast
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, refreshProfile, navigate]);

  const fetchStats = useCallback(async (data: any) => {
    if (!data) return;
    setStatsLoading(true);
    try {
      const isPhysio = data.tipo_usuario === 'fisioterapeuta';
      
      if (isPhysio) {
        // Use Promise.allSettled for maximum resilience
        const results = await Promise.allSettled([
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('fisio_id', data.id),
          supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('fisioterapeuta_id', data.id),
          supabase.from('evolucoes').select('*', { count: 'exact', head: true }).filter('atendimento_id', 'in', 
            supabase.from('agendamentos').select('id').eq('fisio_id', data.id)
          ),
          supabase.from('triagens').select('*', { count: 'exact', head: true })
        ]);

        const getCount = (res: any) => res.status === 'fulfilled' ? (res.value.count || 0) : 0;

        setStats({
          appointments: getCount(results[0]),
          patients: getCount(results[1]),
          records: getCount(results[2]),
          pendingTriages: getCount(results[3])
        });
      } else {
        const results = await Promise.allSettled([
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id),
          supabase.from('evolucoes').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id),
          supabase.from('triagens').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id)
        ]);

        const getCount = (res: any) => res.status === 'fulfilled' ? (res.value.count || 0) : 0;

        setStats({
          appointments: getCount(results[0]),
          patients: 1,
          records: getCount(results[1]),
          pendingTriages: getCount(results[2])
        });
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      // Fallback to zeros on critical error
      setStats({ appointments: 0, patients: 0, records: 0, pendingTriages: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchRecentAppointments = useCallback(async (data: any) => {
    if (!data) return;
    setApptsLoading(true);
    try {
      const isPatient = data.tipo_usuario === 'paciente';
      const roleField = isPatient ? 'paciente_id' : 'fisio_id';
      const { data: appts, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id (nome_completo, email, avatar_url),
          fisioterapeuta:perfis!fisio_id (nome_completo, email, avatar_url)
        `)
        .eq(roleField, data.id)
        .order('data_servico', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erro completo do Supabase ao carregar consultas recentes:", error);
        // Fallback para query simples
        const { data: fallbackAppts, error: fallbackError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq(roleField, data.id)
          .order('data_servico', { ascending: false })
          .limit(5);
        
        if (fallbackError) throw fallbackError;
        setRecentAppointments(fallbackAppts || []);
        return;
      }
      setRecentAppointments(appts || []);
    } catch (err) {
      console.error("Erro ao carregar consultas recentes:", err);
      setRecentAppointments([]);
    } finally {
      setApptsLoading(false);
    }
  }, []);

  const fetchRecentTriages = useCallback(async () => {
    try {
      const { data: triages, error } = await supabase
        .from('triagens')
        .select(`
          *,
          paciente:paciente_id (nome_completo, avatar_url, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTriages(triages || []);
    } catch (err) {
      console.error("Erro ao carregar triagens recentes:", err);
      setRecentTriages([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (profile && lastLoadedProfileId.current !== profile.id) {
      lastLoadedProfileId.current = profile.id;
      fetchStats(profile);
      fetchRecentAppointments(profile);
      fetchRecentTriages();
    }
  }, [user, profile, authLoading, navigate, fetchStats, fetchRecentAppointments, fetchRecentTriages]);

  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.length < 3) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('tipo_usuario', 'paciente')
          .or(`nome_completo.ilike.%${patientSearch}%,email.ilike.%${patientSearch}%`)
          .limit(5);
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Erro ao buscar pacientes:", err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(() => {
      if (patientSearch) searchPatients();
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const isPro = profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';

  useEffect(() => {
    if (profile && isPhysio) {
      setAiMessage(`Olá, Dr. ${profile.nome_completo.split(' ')[0]}! Notei que você tem atendimentos próximos no Morumbi. Deseja otimizar sua rota agora?`);
    } else if (profile) {
      setAiMessage(`Olá, ${profile.nome_completo.split(' ')[0]}! Sua Triagem IA está liberada. Vamos analisar seus sintomas?`);
    }
  }, [profile, isPhysio]);

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparando seu Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-8 pb-12 bg-[#0B1120] relative overflow-hidden transition-colors duration-500">
      {/* Camada de Textura e Brilho de Fundo Premium */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* Banner Pro para Fisioterapeutas */}
        {isPhysio && !isPro && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/40 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <Crown size={28} className="text-white drop-shadow-md" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Seja FisioCareHub Pro</h3>
                <p className="text-blue-100/80 font-medium">Desbloqueie relatórios avançados e análise de desempenho.</p>
              </div>
            </div>
            <Link
              to="/subscription"
              className="px-8 py-3 bg-white text-blue-900 rounded-full font-black hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
            >
              Ver Planos
            </Link>
          </motion.div>
        )}

        {/* Cabeçalho de Boas-vindas Premium Dark */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
          <div className="flex items-center gap-6">
            {!profile ? (
              <div className="w-20 h-20 bg-slate-800 animate-pulse rounded-full" />
            ) : (
              <div className="relative">
                <img 
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                  alt={profile.nome_completo}
                  className="w-20 h-20 rounded-full border-4 border-white/10 shadow-2xl object-cover"
                />
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-[#0B1120] rounded-full shadow-sm" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                <Sparkles size={14} className="text-blue-500" />
                {isPhysio ? 'Gestão Profissional' : 'Sua Jornada de Saúde'}
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {!profile ? (
                  <span className="animate-pulse text-slate-600">Conectando...</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>{getGreeting()},</span>
                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      {isPhysio ? `Dr. ${profile?.nome_completo}` : profile?.nome_completo}
                    </span>
                    {isPro && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-500 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20 border border-amber-400/50">
                        <Crown size={10} fill="currentColor" />
                        Pro
                      </span>
                    )}
                    <span>! 👋</span>
                  </div>
                )}
              </h1>
              <p className="text-slate-400 font-semibold text-sm">Bem-vindo a FisioCareHub, a sua plataforma de performance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-blue-400 hover:shadow-lg hover:shadow-blue-900/20 transition-all border border-white/5 group">
              <Bell size={22} className="group-hover:animate-bounce" />
            </button>
            {!isPhysio && (
              <button 
                onClick={() => navigate('/triage')}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-95"
              >
                <Plus size={20} />
                Nova Triagem
              </button>
            )}
          </div>
        </header>

        {/* Quick Actions - Moved to Top for Physio */}
        {isPhysio && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Link to="/patients" className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] hover:bg-blue-600/10 group transition-all text-center space-y-2 border border-white/10 hover:border-blue-500/20 shadow-xl shadow-blue-900/10">
              <Users className="mx-auto text-slate-400 group-hover:text-blue-400 transition-colors" size={28} />
              <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-400 tracking-widest">Pacientes</p>
            </Link>
            <Link to="/agenda" className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] hover:bg-blue-600/10 group transition-all text-center space-y-2 border border-white/10 hover:border-blue-500/20 shadow-xl shadow-blue-900/10">
              <Calendar className="mx-auto text-slate-400 group-hover:text-blue-400 transition-colors" size={28} />
              <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-400 tracking-widest">Agenda</p>
            </Link>
            <Link to="/exercises" className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] hover:bg-emerald-600/10 group transition-all text-center space-y-2 border border-white/10 hover:border-emerald-500/20 shadow-xl shadow-emerald-900/10">
              <Activity className="mx-auto text-slate-400 group-hover:text-emerald-400 transition-colors" size={28} />
              <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-emerald-400 tracking-widest">Exercícios</p>
            </Link>
            <Link to="/records" className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] hover:bg-rose-600/10 group transition-all text-center space-y-2 border border-white/10 hover:border-rose-500/20 shadow-xl shadow-rose-900/10">
              <FileText className="mx-auto text-slate-400 group-hover:text-rose-400 transition-colors" size={28} />
              <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-rose-400 tracking-widest">Prontuários</p>
            </Link>
          </motion.div>
        )}

      {/* Next Step Section for Patients */}
      {!isPhysio && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recentAppointments.filter(a => new Date(a.data_servico) >= new Date()).length > 0 ? (
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-900/40">
                  <span className="text-[10px] font-black uppercase opacity-80">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  <span className="text-2xl font-black">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).getDate()}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Próxima Consulta</p>
                  <p className="text-xl font-black text-white tracking-tight">
                    {recentAppointments.find(a => new Date(a.data_servico) >= new Date()).fisioterapeuta?.nome_completo}
                  </p>
                  <p className="text-sm text-slate-400 font-bold">
                    {new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <span className="text-blue-400">Presencial</span>
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/appointments')} className="p-4 bg-white/5 text-slate-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner border border-white/5">
                  <Calendar size={32} />
                </div>
                <div>
                  <p className="text-xl font-black text-white tracking-tight">Agendar Consulta</p>
                  <p className="text-sm text-slate-400 font-bold">Você não tem consultas pendentes.</p>
                </div>
              </div>
              <button onClick={() => navigate('/triage')} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40">
                Agendar
              </button>
            </div>
          )}

          {/* Quick Stats Summary (Compact) */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] text-white shadow-2xl border border-white/10 flex items-center justify-around relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black text-white">{stats.records > 0 ? '75%' : '0%'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Melhora</p>
            </div>
            <div className="w-px h-10 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black text-white">{stats.appointments}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Sessões</p>
            </div>
            <div className="w-px h-10 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black text-white">{stats.records > 0 ? '12' : '0'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Exercícios</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dashboard (Moved to top for patients) */}
      {!isPhysio && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight">Evolução da <span className="text-blue-400 italic">Dor</span></h2>
            {stats.records > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                <TrendingUp size={12} />
                +75% de Melhora
              </div>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
            <EvolutionCharts melhora={stats.records > 0 ? 75 : 0} />
          </div>
        </div>
      )}

      {/* Stats Grid - Only for Physio or if not empty for patients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Consultas', value: stats.appointments, icon: Calendar, color: 'blue', trend: '+12%', show: isPhysio || stats.appointments > 0 },
          { label: isPhysio ? 'Pacientes' : 'Fisioterapeutas', value: stats.patients, icon: Users, color: 'emerald', trend: '+5%', show: isPhysio || stats.patients > 0 },
          { label: 'Prontuários', value: stats.records, icon: FileText, color: 'indigo', trend: '+8%', show: isPhysio || stats.records > 0 },
          { label: 'Triagens', value: stats.pendingTriages, icon: Activity, color: 'rose', trend: '0%', show: isPhysio || stats.pendingTriages > 0 },
        ].filter(s => s.show).map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 group relative overflow-hidden hover:bg-white/10 transition-all shadow-2xl shadow-blue-900/20"
          >
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.05] transition-transform group-hover:scale-110",
              stat.color === 'blue' ? "bg-blue-600" : 
              stat.color === 'emerald' ? "bg-emerald-600" :
              stat.color === 'indigo' ? "bg-indigo-600" : "bg-rose-600"
            )} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all border border-white/5",
                stat.color === 'blue' && "bg-blue-500/10 text-blue-400 shadow-blue-900/20",
                stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20",
                stat.color === 'indigo' && "bg-indigo-500/10 text-indigo-400 shadow-indigo-900/20",
                stat.color === 'rose' && "bg-rose-500/10 text-rose-400 shadow-rose-900/20",
              )}>
                <stat.icon size={28} />
              </div>
              {stat.trend !== '0%' && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border",
                  stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <Activity size={12} />}
                  {stat.trend}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-10 w-16 bg-slate-800 animate-pulse rounded-lg"></div>
              ) : (
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                  {stat.label === 'Consultas' && (
                    <div className="flex gap-0.5 h-8 items-end pb-1">
                      {[40, 70, 45, 90, 65, 80, 50].map((h, idx) => (
                        <div 
                          key={idx} 
                          className="w-1 bg-blue-500/40 rounded-full" 
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-base font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isPhysio && (
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 space-y-6 shadow-2xl shadow-blue-900/20">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-white tracking-tight">Buscar Pacientes</h3>
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {searching ? <Loader2 className="animate-spin text-blue-500" size={20} /> : <Users className="text-slate-500" size={20} />}
              </div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              {searchResults.map((patient) => (
                <div 
                  key={patient.id} 
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                    selectedPatientId === patient.id ? "bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={patient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.id}`}
                      alt={patient.nome_completo}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10"
                    />
                    <div>
                      <p className={cn("font-bold transition-colors", selectedPatientId === patient.id ? "text-blue-400" : "text-white group-hover:text-blue-400")}>
                        {patient.nome_completo}
                      </p>
                      <p className="text-sm text-slate-400">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPatientId === patient.id && (
                      <div className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                        Selecionado
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat?user=${patient.id}`);
                      }}
                      className="p-3 bg-white/10 text-blue-400 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all border border-white/5"
                    >
                      <MessageSquare size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {patientSearch.length >= 3 && searchResults.length === 0 && !searching && (
            <p className="text-center text-slate-500 py-4">Nenhum paciente encontrado para "{patientSearch}"</p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-display font-black text-white tracking-tight">Consultas <span className="text-blue-400 italic">Recentes</span></h2>
            <Link to="/appointments" className="text-base font-bold text-blue-400 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl shadow-blue-900/20">
            {apptsLoading ? (
              <div className="p-12 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <Calendar size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhuma consulta agendada.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentAppointments.map((appt) => (
                  <div key={appt.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center font-black text-base border border-blue-500/20">
                        {new Date(appt.data_servico).getDate()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                          {isPhysio ? appt.paciente?.nome_completo : appt.fisioterapeuta?.nome_completo}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(appt.data_servico).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                          <span className="capitalize">{appt.status}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/appointments')}
                      className="p-2 text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Triages */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-display font-black text-white tracking-tight">
                {isPhysio ? (
                  <>Triagens <span className="text-indigo-400 italic">Inteligentes</span></>
                ) : (
                  <>Suas <span className="text-indigo-400 italic">Triagens</span></>
                )}
              </h2>
              <Link 
                to={isPhysio ? "/records" : "/triage"} 
                className="text-base font-bold text-indigo-400 hover:underline flex items-center gap-1"
              >
                {isPhysio ? "Ver todas" : "Ver histórico"} <ChevronRight size={16} />
              </Link>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl shadow-blue-900/20">
              {recentTriages.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <BrainCircuit size={32} />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhuma triagem recente.</p>
                  {!isPhysio && (
                    <button 
                      onClick={() => navigate('/triage')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                    >
                      Fazer minha primeira triagem
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentTriages.map((triage) => (
                    <div key={triage.id} className="p-6 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={isPhysio ? (triage.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${triage.paciente_id}`) : (profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)}
                            alt={isPhysio ? triage.paciente?.nome_completo : profile?.nome_completo}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-base font-bold text-white">
                              {isPhysio ? triage.paciente?.nome_completo : "Sua Avaliação"}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">{formatDate(triage.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                            {triage.classificacao}
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            triage.gravidade === 'grave' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}>
                            {triage.gravidade}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><MapPin size={14} /> {triage.regiao_dor}</span>
                          <span className="flex items-center gap-1"><Thermometer size={14} /> Dor {triage.escala_dor}/10</span>
                          {triage.red_flag && (
                            <span className="flex items-center gap-1 text-rose-400 font-bold">
                              <AlertTriangle size={14} /> Red Flag!
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => navigate(isPhysio ? `/records?patient=${triage.paciente_id}` : '/triage')}
                          className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & AI Insights */}
        <div className="space-y-8">
          <motion.div 
            layout
            onClick={() => setIsAiExpanded(!isAiExpanded)}
            className={cn(
              "bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden border border-white/10 cursor-pointer group",
              isAiExpanded ? "lg:col-span-1 h-auto" : "h-fit"
            )}
          >
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                  <BrainCircuit size={24} className="animate-bounce" />
                </div>
                {isAiExpanded && (
                  <button className="text-white/60 hover:text-white transition-colors">
                    <ChevronRight size={20} className="rotate-90" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Assistente <span className="text-blue-200">Viva</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-blue-50/90 text-base leading-relaxed font-medium">
                  {aiMessage}
                </p>
              </div>

              {isAiExpanded && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-4 border-t border-white/10"
                >
                  <div className="bg-black/20 backdrop-blur-xl p-4 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Sugestões de Ação</p>
                    <div className="flex flex-wrap gap-2">
                      {isPhysio ? (
                        <>
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">Gerar Relatório SOAP</button>
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">Resumir Dia</button>
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">Ditar Evolução</button>
                        </>
                      ) : (
                        <>
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">Ver Treino de Hoje</button>
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all border border-white/10">Relatar Dor</button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Pergunte algo..." 
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button className="p-3 bg-white text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg">
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {!isAiExpanded && !isPhysio && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/triage');
                  }}
                  className="w-full py-4 bg-white text-blue-900 rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Iniciar Triagem
                </button>
              )}
            </div>
          </motion.div>

          {/* Quick Actions - Removed from here as it was moved to top */}
        </div>
      </div>
      {/* New Features Section */}
      <div className="space-y-12">
        {isPhysio ? (
          <>
            {/* Physio Pro Features */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white tracking-tight">Recursos Profissionais</h2>
                <div className="flex items-center gap-3">
                  <select className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                    <option>Semana</option>
                    <option>Mês</option>
                  </select>
                  {!isPro && (
                    <span className="px-4 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                      Disponível no Pro
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20 relative group">
                  <div className="absolute top-8 right-8 z-20">
                    <button className="p-2 bg-white/5 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                      <TrendingUp size={16} />
                    </button>
                  </div>
                  <ProGuard variant="full">
                    <FinancialDashboard />
                  </ProGuard>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20 relative group">
                    <div className="absolute top-8 right-8 z-20 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                        <MapPin size={12} />
                        3 Pacientes na Rota
                      </div>
                    </div>
                    <ProGuard variant="full">
                      <RouteOptimizer />
                    </ProGuard>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
                    <ProGuard variant="full">
                      <SOAPIntelligentRecord 
                        pacienteId={selectedPatientId || undefined} 
                        onSave={() => {
                          fetchStats(profile);
                          fetchRecentAppointments(profile);
                        }}
                      />
                    </ProGuard>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
                    <ProGuard variant="full">
                      <EvolutionCharts />
                    </ProGuard>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
                  <ProGuard variant="full">
                    <DigitalLibrary />
                  </ProGuard>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Patient Features */}
        <div className="space-y-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
                <PainDiary />
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20">
                <ExerciseChecklist />
              </div>
            </div>
            <div className="space-y-8">
              {/* Quick Actions (2x2 Grid) */}
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20 space-y-6">
                <h3 className="text-xl font-black text-white">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/chat" className="p-6 bg-white/5 rounded-3xl hover:bg-blue-600/10 group transition-all text-center space-y-2 border border-white/5 hover:border-blue-500/20 shadow-sm">
                    <MessageSquare className="mx-auto text-slate-500 group-hover:text-blue-400 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-blue-400">Chat</p>
                  </Link>
                  <Link to="/exercises" className="p-6 bg-white/5 rounded-3xl hover:bg-emerald-600/10 group transition-all text-center space-y-2 border border-white/5 hover:border-emerald-500/20 shadow-sm">
                    <Activity className="mx-auto text-slate-500 group-hover:text-emerald-400 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-emerald-400">Treinos</p>
                  </Link>
                  <button 
                    onClick={() => window.open(`https://meet.jit.si/FisioCareHub-${profile?.id || 'room'}`, '_blank')}
                    className="p-6 bg-white/5 rounded-3xl hover:bg-sky-600/10 group transition-all text-center space-y-2 border border-white/5 hover:border-sky-500/20 shadow-sm"
                  >
                    <Video className="mx-auto text-slate-500 group-hover:text-sky-400 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-sky-400">Consulta</p>
                  </button>
                  <Link to="/triage" className="p-6 bg-white/5 rounded-3xl hover:bg-indigo-600/10 group transition-all text-center space-y-2 border border-white/5 hover:border-indigo-500/20 shadow-sm">
                    <BrainCircuit className="mx-auto text-slate-500 group-hover:text-indigo-400 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-500 group-hover:text-indigo-400">Triagem</p>
                  </Link>
                </div>
              </div>

              {/* Gamification Section */}
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl shadow-blue-900/20 space-y-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Trophy className="text-amber-500" size={24} />
                  Suas Conquistas
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Paciente Bronze', desc: '7 dias de exercícios', icon: Medal, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', progress: stats.records > 0 ? 100 : 0 },
                    { label: 'Foco Total', desc: 'Triagem concluída', icon: Zap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', progress: stats.pendingTriages > 0 ? 100 : 0 },
                    { label: 'Superação', desc: 'Redução de 50% na dor', icon: Star, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', progress: stats.records > 5 ? 40 : 0 },
                  ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all bg-white/5">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border", badge.color, badge.progress === 0 && "grayscale opacity-30")}>
                        <badge.icon size={24} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-white">{badge.label}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{badge.desc}</p>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", badge.color.split(' ')[0].replace('text-', 'bg-'))}
                            style={{ width: `${badge.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      {/* Floating Action Button (FAB) - Positioned safely */}
      {isPhysio && (
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => navigate('/agenda')}
            className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/40 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all group border-4 border-white/10"
          >
            <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      )}
    </div>
  </div>
  );
}
