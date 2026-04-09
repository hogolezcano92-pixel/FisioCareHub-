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

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparando seu Dashboard...</p>
    </div>
  );

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const isPro = profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-8 pb-12 bg-[#F8FAFC] transition-colors duration-500">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Pro Banner for Physios */}
      {isPhysio && !isPro && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-sky-100 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Seja FisioCareHub Pro</h3>
              <p className="text-blue-50 font-medium">Desbloqueie relatórios avançados, análises de desempenho e muito mais.</p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="px-8 py-3 bg-white text-blue-600 rounded-full font-black hover:bg-blue-50 transition-all shadow-lg whitespace-nowrap"
          >
            Ver Planos
          </Link>
        </motion.div>
      )}

        {/* Welcome Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-card p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-6">
            {!profile ? (
              <div className="w-20 h-20 bg-slate-100 animate-pulse rounded-full" />
            ) : (
              <div className="relative">
                <img 
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                  alt={profile.nome_completo}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-premium object-cover"
                />
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary border-4 border-white rounded-full" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                <Sparkles size={14} className="animate-pulse" />
                {isPhysio ? 'Painel Profissional' : 'Painel do Paciente'}
              </div>
              <h1 className="text-3xl font-black text-text-main tracking-tight">
                {!profile ? (
                  <span className="animate-pulse text-slate-300">Carregando...</span>
                ) : (
                  <>{getGreeting()}, <span className="text-primary">{isPhysio ? `Dr. ${profile?.nome_completo?.split(' ')[0]}` : profile?.nome_completo?.split(' ')[0]}</span>! 👋</>
                )}
              </h1>
              <p className="text-text-muted font-medium">Bem-vindo ao FisioCareHub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-4 glass-card-hover rounded-2xl text-text-muted hover:text-primary transition-all group">
              <Bell size={22} className="group-hover:rotate-12 transition-transform" />
            </button>
            {!isPhysio && (
              <button 
                onClick={() => navigate('/triage')}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-hover transition-all shadow-premium hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={20} />
                Nova Triagem
              </button>
            )}
          </div>
        </header>

      {/* Next Step Section for Patients */}
      {!isPhysio && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recentAppointments.filter(a => new Date(a.data_servico) >= new Date()).length > 0 ? (
            <div className="glass-card glass-card-hover p-6 rounded-[2.5rem] flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-primary text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-[10px] font-black uppercase opacity-80">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  <span className="text-2xl font-black">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).getDate()}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Próxima Consulta</p>
                  <p className="text-xl font-black text-text-main tracking-tight">
                    {recentAppointments.find(a => new Date(a.data_servico) >= new Date()).fisioterapeuta?.nome_completo}
                  </p>
                  <p className="text-sm text-text-muted font-bold">
                    {new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <span className="text-primary">Presencial</span>
                  </p>
                </div>
              </div>
              <button onClick={() => navigate('/appointments')} className="p-4 bg-bg-general text-text-muted rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <div className="glass-card glass-card-hover p-6 rounded-[2.5rem] flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-bg-general text-text-muted rounded-2xl flex items-center justify-center shadow-inner">
                  <Calendar size={32} />
                </div>
                <div>
                  <p className="text-xl font-black text-text-main tracking-tight">Agendar Consulta</p>
                  <p className="text-sm text-text-muted font-bold">Você não tem consultas pendentes.</p>
                </div>
              </div>
              <button onClick={() => navigate('/triage')} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                Agendar
              </button>
            </div>
          )}

          {/* Quick Stats Summary (Compact) */}
          <div className="bg-text-main p-8 rounded-[3rem] text-white shadow-2xl flex items-center justify-around relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black">{stats.records > 0 ? '75%' : '0%'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Melhora</p>
            </div>
            <div className="w-px h-10 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black">{stats.appointments}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Sessões</p>
            </div>
            <div className="w-px h-10 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-3xl font-black">{stats.records > 0 ? '12' : '0'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Exercícios</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dashboard (Moved to top for patients) */}
      {!isPhysio && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-text-main tracking-tight">Evolução da <span className="text-primary italic">Dor</span></h2>
            {stats.records > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <TrendingUp size={12} />
                +75% de Melhora
              </div>
            )}
          </div>
          <EvolutionCharts melhora={stats.records > 0 ? 75 : 0} />
        </div>
      )}

      {/* Stats Grid - Only for Physio or if not empty for patients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Consultas', value: stats.appointments, icon: Calendar, color: 'primary', trend: '+12%', show: isPhysio || stats.appointments > 0 },
          { label: isPhysio ? 'Pacientes' : 'Fisioterapeutas', value: stats.patients, icon: Users, color: 'emerald', trend: '+5%', show: isPhysio || stats.patients > 0 },
          { label: 'Prontuários', value: stats.records, icon: FileText, color: 'indigo', trend: '+8%', show: isPhysio || stats.records > 0 },
          { label: 'Triagens', value: stats.pendingTriages, icon: Activity, color: 'rose', trend: '0%', show: isPhysio || stats.pendingTriages > 0 },
        ].filter(s => s.show).map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card glass-card-hover p-8 rounded-[3rem] group relative overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform group-hover:scale-110",
              stat.color === 'primary' ? "bg-primary" : 
              stat.color === 'emerald' ? "bg-emerald-600" :
              stat.color === 'indigo' ? "bg-indigo-600" : "bg-rose-600"
            )} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                stat.color === 'primary' && "bg-primary/10 text-primary shadow-primary/10",
                stat.color === 'emerald' && "bg-emerald-50 text-emerald-600 shadow-emerald-100",
                stat.color === 'indigo' && "bg-indigo-50 text-indigo-600 shadow-indigo-100",
                stat.color === 'rose' && "bg-rose-50 text-rose-600 shadow-rose-100",
              )}>
                <stat.icon size={28} />
              </div>
              {stat.trend !== '0%' && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                  stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
                )}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <Activity size={12} />}
                  {stat.trend}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-10 w-16 bg-slate-100 animate-pulse rounded-lg"></div>
              ) : (
                <p className="text-4xl font-black text-text-main tracking-tighter">{stat.value}</p>
              )}
              <p className="text-base font-bold text-text-muted uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isPhysio && (
        <div className="glass-card p-8 rounded-[3rem] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-text-main tracking-tight">Buscar Pacientes</h3>
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {searching ? <Loader2 className="animate-spin text-primary" size={20} /> : <Users className="text-text-muted" size={20} />}
              </div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-12 pr-4 py-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
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
                    selectedPatientId === patient.id ? "bg-primary/5 border-primary shadow-md" : "bg-bg-general border-border-soft hover:bg-white hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={patient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.id}`}
                      alt={patient.nome_completo}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className={cn("font-bold transition-colors", selectedPatientId === patient.id ? "text-primary" : "text-text-main group-hover:text-primary")}>
                        {patient.nome_completo}
                      </p>
                      <p className="text-sm text-text-muted">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPatientId === patient.id && (
                      <div className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                        Selecionado
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat?user=${patient.id}`);
                      }}
                      className="p-3 bg-white text-primary rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all"
                    >
                      <MessageSquare size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {patientSearch.length >= 3 && searchResults.length === 0 && !searching && (
            <p className="text-center text-text-muted py-4">Nenhum paciente encontrado para "{patientSearch}"</p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-display font-black text-text-main tracking-tight">Consultas <span className="text-primary italic">Recentes</span></h2>
            <Link to="/appointments" className="text-base font-bold text-primary hover:underline flex items-center gap-1">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          <div className="glass-card rounded-[3rem] overflow-hidden">
            {apptsLoading ? (
              <div className="p-12 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-bg-general text-text-muted rounded-full flex items-center justify-center mx-auto">
                  <Calendar size={32} />
                </div>
                <p className="text-text-muted font-medium">Nenhuma consulta agendada.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-soft">
                {recentAppointments.map((appt) => (
                  <div key={appt.id} className="p-6 flex items-center justify-between hover:bg-bg-general transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-base">
                        {new Date(appt.data_servico).getDate()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-text-main group-hover:text-primary transition-colors">
                          {isPhysio ? appt.paciente?.nome_completo : appt.fisioterapeuta?.nome_completo}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-text-muted font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(appt.data_servico).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="w-1 h-1 bg-border-soft rounded-full"></span>
                          <span className="capitalize">{appt.status}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/appointments')}
                      className="p-2 text-text-muted hover:text-primary hover:bg-white rounded-xl transition-all"
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
              <h2 className="text-4xl font-display font-black text-text-main tracking-tight">
                {isPhysio ? (
                  <>Triagens <span className="text-indigo-600 italic">Inteligentes</span></>
                ) : (
                  <>Suas <span className="text-indigo-600 italic">Triagens</span></>
                )}
              </h2>
              <Link 
                to={isPhysio ? "/records" : "/triage"} 
                className="text-base font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {isPhysio ? "Ver todas" : "Ver histórico"} <ChevronRight size={16} />
              </Link>
            </div>

            <div className="glass-card rounded-[3rem] overflow-hidden">
              {recentTriages.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-bg-general text-text-muted rounded-full flex items-center justify-center mx-auto">
                    <BrainCircuit size={32} />
                  </div>
                  <p className="text-text-muted font-medium">Nenhuma triagem recente.</p>
                  {!isPhysio && (
                    <button 
                      onClick={() => navigate('/triage')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-700 transition-all"
                    >
                      Fazer minha primeira triagem
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border-soft">
                  {recentTriages.map((triage) => (
                    <div key={triage.id} className="p-6 hover:bg-bg-general transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={isPhysio ? (triage.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${triage.paciente_id}`) : (profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)}
                            alt={isPhysio ? triage.paciente?.nome_completo : profile?.nome_completo}
                            className="w-12 h-12 rounded-xl object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-base font-bold text-text-main">
                              {isPhysio ? triage.paciente?.nome_completo : "Sua Avaliação"}
                            </p>
                            <p className="text-xs text-text-muted font-medium">{formatDate(triage.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {triage.classificacao}
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            triage.gravidade === 'grave' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {triage.gravidade}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-text-muted font-medium">
                          <span className="flex items-center gap-1"><MapPin size={14} /> {triage.regiao_dor}</span>
                          <span className="flex items-center gap-1"><Thermometer size={14} /> Dor {triage.escala_dor}/10</span>
                          {triage.red_flag && (
                            <span className="flex items-center gap-1 text-rose-600 font-bold">
                              <AlertTriangle size={14} /> Red Flag!
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => navigate(isPhysio ? `/records?patient=${triage.paciente_id}` : '/triage')}
                          className="p-2 text-text-muted hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
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
          <div className={cn(
            "bg-gradient-to-br from-indigo-600 to-primary p-8 rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <BrainCircuit size={24} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Assistente IA
                </h3>
                <p className="text-blue-100 text-base leading-relaxed font-medium">
                  {isPhysio ? "Bem-vindo ao seu painel profissional. Como posso ajudar na gestão dos seus pacientes hoje?" : "Sua Triagem IA está liberada! Analise seus sintomas agora com nossa inteligência artificial."}
                </p>
              </div>
              {!isPhysio && (
                <button 
                  onClick={() => navigate('/triage')}
                  className="w-full py-4 bg-white text-primary rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Iniciar Triagem
                </button>
              )}
            </div>
          </div>

          {isPhysio && (
            <div className="glass-card p-8 rounded-[3rem] space-y-6">
              <h3 className="text-xl font-black text-text-main">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/patients" className="p-6 bg-white/50 rounded-3xl hover:bg-primary/5 group transition-all text-center space-y-2 border border-border-soft hover:border-primary/20 shadow-sm">
                  <Users className="mx-auto text-text-muted group-hover:text-primary transition-colors" size={28} />
                  <p className="text-xs font-black uppercase text-text-muted group-hover:text-primary">Pacientes</p>
                </Link>
                <Link to="/agenda" className="p-6 bg-white/50 rounded-3xl hover:bg-sky-50 group transition-all text-center space-y-2 border border-border-soft hover:border-sky-100 shadow-sm">
                  <Calendar className="mx-auto text-text-muted group-hover:text-sky-600 transition-colors" size={28} />
                  <p className="text-xs font-black uppercase text-text-muted group-hover:text-sky-600">Agenda</p>
                </Link>
                <Link to="/exercises" className="p-6 bg-white/50 rounded-3xl hover:bg-emerald-50 group transition-all text-center space-y-2 border border-border-soft hover:border-emerald-100 shadow-sm">
                  <Activity className="mx-auto text-text-muted group-hover:text-emerald-600 transition-colors" size={28} />
                  <p className="text-xs font-black uppercase text-text-muted group-hover:text-emerald-600">Exercícios</p>
                </Link>
                <Link to="/records" className="p-6 bg-white/50 rounded-3xl hover:bg-rose-50 group transition-all text-center space-y-2 border border-border-soft hover:border-rose-100 shadow-sm">
                  <FileText className="mx-auto text-text-muted group-hover:text-rose-600 transition-colors" size={28} />
                  <p className="text-xs font-black uppercase text-text-muted group-hover:text-rose-600">Prontuários</p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* New Features Section */}
      <div className="space-y-12">
        {isPhysio ? (
          <>
            {/* Physio Pro Features */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recursos Profissionais</h2>
                {!isPro && (
                  <span className="px-4 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Disponível no Pro
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                <ProGuard variant="full">
                  <FinancialDashboard />
                </ProGuard>

                <div className="grid lg:grid-cols-2 gap-8">
                  <ProGuard variant="full">
                    <RouteOptimizer />
                  </ProGuard>
                  <ProGuard variant="full">
                    <SOAPIntelligentRecord 
                      pacienteId={selectedPatientId || undefined} 
                      onSave={() => {
                        fetchStats(profile);
                        fetchRecentAppointments(profile);
                      }}
                    />
                  </ProGuard>
                  <ProGuard variant="full">
                    <EvolutionCharts />
                  </ProGuard>
                </div>
                <ProGuard variant="full">
                  <DigitalLibrary />
                </ProGuard>
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Patient Features */}
        <div className="space-y-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <PainDiary />
            </div>
            <div className="space-y-8">
              {/* Quick Actions (2x2 Grid) */}
              <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <h3 className="text-xl font-black text-slate-900">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/chat" className="p-6 bg-white/50 rounded-3xl hover:bg-blue-50 group transition-all text-center space-y-2 border border-slate-50 hover:border-blue-100 shadow-sm">
                    <MessageSquare className="mx-auto text-slate-400 group-hover:text-blue-600 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600">Chat</p>
                  </Link>
                  <button 
                    onClick={() => window.open(`https://meet.jit.si/FisioCareHub-${profile?.id || 'room'}`, '_blank')}
                    className="p-6 bg-white/50 rounded-3xl hover:bg-sky-50 group transition-all text-center space-y-2 border border-slate-50 hover:border-sky-100 shadow-sm"
                  >
                    <Video className="mx-auto text-slate-400 group-hover:text-sky-600 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-sky-600">Consulta</p>
                  </button>
                  <Link to="/triage" className="p-6 bg-white/50 rounded-3xl hover:bg-emerald-50 group transition-all text-center space-y-2 border border-border-soft hover:border-emerald-100 shadow-sm">
                    <BrainCircuit className="mx-auto text-text-muted group-hover:text-emerald-600 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-text-muted group-hover:text-emerald-600">Triagem</p>
                  </Link>
                  <button 
                    onClick={() => document.getElementById('digital-library')?.scrollIntoView({ behavior: 'smooth' })}
                    className="p-6 bg-white/50 rounded-3xl hover:bg-amber-50 group transition-all text-center space-y-2 border border-border-soft hover:border-amber-100 shadow-sm"
                  >
                    <BookOpen className="mx-auto text-text-muted group-hover:text-amber-600 transition-colors" size={28} />
                    <p className="text-[10px] font-black uppercase text-text-muted group-hover:text-amber-600">Biblioteca</p>
                  </button>
                </div>
              </div>

              {/* Gamification Section */}
              <div className="glass-card p-8 rounded-[3rem] space-y-6">
                <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                  <Trophy className="text-amber-500" size={24} />
                  Suas Conquistas
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Paciente Bronze', desc: '7 dias de exercícios', icon: Medal, color: 'text-amber-600 bg-amber-50', progress: stats.records > 0 ? 100 : 0 },
                    { label: 'Foco Total', desc: 'Triagem concluída', icon: Zap, color: 'text-blue-600 bg-blue-50', progress: stats.pendingTriages > 0 ? 100 : 0 },
                    { label: 'Superação', desc: 'Redução de 50% na dor', icon: Star, color: 'text-purple-600 bg-purple-50', progress: stats.records > 5 ? 40 : 0 },
                  ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border-soft/50 hover:border-border-soft transition-all bg-white/30">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", badge.color, badge.progress === 0 && "grayscale opacity-50")}>
                        <badge.icon size={24} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-text-main">{badge.label}</p>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{badge.desc}</p>
                        <div className="w-full h-1.5 bg-bg-general rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", badge.color.split(' ')[0].replace('text', 'bg'))}
                            style={{ width: `${badge.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div id="digital-library">
                <DigitalLibrary />
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
