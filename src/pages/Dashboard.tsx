import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  AlertTriangle,
  Smartphone,
  DollarSign
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { formatDateBR, formatHourBR, formatOnlyDateBR } from '../utils/date';
import { toast } from 'sonner';

// New FisioCare Components
import { PainDiary, ExerciseChecklist } from '../components/FisioCare/PatientCare';
import { SOAPIntelligentRecord } from '../components/FisioCare/SOAPRecord';
import { RouteOptimizer } from '../components/FisioCare/RouteOptimizer';
import { FinancialDashboard } from '../components/FisioCare/FinancialDashboard';
import { DigitalLibrary } from '../components/FisioCare/DigitalLibrary';
import { EvolutionCharts } from '../components/FisioCare/EvolutionCharts';
import ActivityTimeline from '../components/FisioCare/ActivityTimeline';
import { Skeleton, CardSkeleton, ListSkeleton } from '../components/Skeleton';
import FloatingHelpMenu from '../components/FloatingHelpMenu';
import ProBanner from '../components/ProBanner';
import ProGuard from '../components/ProGuard';
import ClinicalAssistant from '../components/FisioCare/ClinicalAssistant';
import EvaluationModal from '../components/FisioCare/EvaluationModal';
import { Trophy, Medal, Star, Zap } from 'lucide-react';
import ApprovalWelcomeModal from '../components/ApprovalWelcomeModal';

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
  const [activities, setActivities] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<any>(null);

  const lastLoadedProfileId = useRef<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
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

  const fetchDashboardData = useCallback(async (data: any) => {
    if (!data) return;
    
    setStatsLoading(true);
    setApptsLoading(true);

    // If patient, check for pending evaluations
    if (data.tipo_usuario === 'paciente') {
      checkPendingEvaluations(data.id);
    }
    
    try {
      const isPhysio = data.tipo_usuario === 'fisioterapeuta';
      const roleField = data.tipo_usuario === 'paciente' ? 'paciente_id' : 'fisio_id';

      // Fetch IDs for evolutions filter if physio
      let agendamentoIds: string[] = [];
      if (isPhysio) {
        const { data: appts } = await supabase.from('agendamentos').select('id').eq('fisio_id', data.id);
        agendamentoIds = (appts || []).map(a => a.id);
      }

      // Parallelize all initial fetches
      const queries = [
        // Stats
        isPhysio ? Promise.all([
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('fisio_id', data.id),
          supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('fisioterapeuta_id', data.id),
          agendamentoIds.length > 0 
            ? supabase.from('evolucoes').select('*', { count: 'exact', head: true }).in('atendimento_id', agendamentoIds)
            : Promise.resolve({ count: 0 }),
          supabase.from('triagens').select('*', { count: 'exact', head: true })
        ]) : Promise.all([
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id),
          supabase.from('evolucoes').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id),
          supabase.from('triagens').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id)
        ]),
        // Appointments
        supabase
          .from('agendamentos')
          .select(`
            *,
            paciente:perfis(id, nome_completo, avatar_url),
            fisioterapeuta:perfis(id, nome_completo, avatar_url)
          `)
          .eq(roleField, data.id)
          .order('data', { ascending: false })
          .order('hora', { ascending: false })
          .limit(5),
        // Triages
        supabase
          .from('triagens')
          .select(`
            *,
            paciente:paciente_id (nome_completo, avatar_url, email)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        // Activities
        supabase
          .from('historico_atividades')
          .select('*')
          .eq('usuario_id', data.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ];

      // Process Stats
      const results = await Promise.allSettled(queries as any[]);
      const statsResults = results[0];
      const apptsResult = results[1];
      const triagesResult = results[2];
      const activitiesResult = results[3];

      if (statsResults.status === 'fulfilled') {
        const res = statsResults.value;
        if (isPhysio) {
          setStats({
            appointments: res[0].count || 0,
            patients: res[1].count || 0,
            records: res[2].count || 0,
            pendingTriages: res[3].count || 0
          });
        } else {
          setStats({
            appointments: res[0].count || 0,
            patients: 1,
            records: res[1].count || 0,
            pendingTriages: res[2].count || 0
          });
        }
      }

      // Process Appointments
      if (apptsResult.status === 'fulfilled') {
        setRecentAppointments(apptsResult.value.data || []);
      }

      // Process Triages
      if (triagesResult.status === 'fulfilled') {
        setRecentTriages(triagesResult.value.data || []);
      }

      // Process Activities
      if (activitiesResult && activitiesResult.status === 'fulfilled') {
        setActivities(activitiesResult.value.data || []);
      }

    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setStatsLoading(false);
      setApptsLoading(false);
    }
  }, []);

  const { isPhysio, isApproved, isPro, isAdmin } = useMemo(() => ({
    isPhysio: profile?.tipo_usuario === 'fisioterapeuta',
    isApproved: profile?.status_aprovacao === 'aprovado',
    isPro: profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo',
    isAdmin: profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com'
  }), [profile, subscription, user?.email]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (profile) {
      if (isPhysio && !isApproved && !isAdmin) {
        navigate('/aguardando-aprovacao', { replace: true });
        return;
      }

      if (lastLoadedProfileId.current !== profile.id) {
        lastLoadedProfileId.current = profile.id;
        fetchDashboardData(profile);
        
        // Welcome Flow Trigger
        if (profile.tipo_usuario === 'fisioterapeuta' && profile.status_aprovacao === 'aprovado' && !profile.plan_intro_seen) {
          setShowWelcome(true);
        }
      }

      // Handle navigation actions
      const action = searchParams.get('action');
      if (action === 'services') {
        const element = document.getElementById('financial-section');
        element?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-financial-services'));
        }, 800);
      }
    }
  }, [user, profile, authLoading, navigate, fetchDashboardData, isPhysio, isApproved, isAdmin, searchParams]);

  useEffect(() => {
    if (authLoading || !user) return;

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
      const offset = -3; // GMT-3 for America/Sao_Paulo (simplified, but works for most cases in Brazil)
      const now = new Date();
      const brazilTime = new Date(now.getTime() + (offset * 3600 * 1000) + (now.getTimezoneOffset() * 60000));
      const hour = brazilTime.getHours();
      if (hour >= 5 && hour < 12) return 'Bom dia';
      if (hour >= 12 && hour < 18) return 'Boa tarde';
      return 'Boa noite';
    };

  const checkPendingEvaluations = useCallback(async (userId: string) => {
    try {
      const { data: appointments, error: apptError } = await supabase
        .from('agendamentos')
        .select(`
          id, 
          fisio_id,
          fisioterapeuta:perfis!fisio_id(nome_completo)
        `)
        .eq('paciente_id', userId)
        .eq('status', 'concluido')
        .order('data_servico', { ascending: false });

      if (apptError) throw apptError;
      if (!appointments || appointments.length === 0) return;

      const { data: evaluations, error: evalError } = await supabase
        .from('avaliacoes')
        .select('agendamento_id')
        .eq('paciente_id', userId);

      if (evalError) throw evalError;

      const evaluatedIds = new Set(evaluations?.map(e => e.agendamento_id) || []);
      const apptToEvaluate = appointments.find(a => !evaluatedIds.has(a.id));

      if (apptToEvaluate) {
        setPendingEvaluation({
          id: apptToEvaluate.id,
          fisio_id: apptToEvaluate.fisio_id,
          fisio_nome: Array.isArray(apptToEvaluate.fisioterapeuta) 
            ? apptToEvaluate.fisioterapeuta[0]?.nome_completo 
            : (apptToEvaluate.fisioterapeuta as any)?.nome_completo
        });
        setShowEvaluation(true);
      }
    } catch (err) {
      console.error('Erro ao verificar avaliações pendentes:', err);
    }
  }, []);

  useEffect(() => {
    if (!profile || !isPhysio || authLoading || !user) return;
    
    setAiMessage(`Olá, Dr. ${profile.nome_completo.split(' ')[0]}. Notei que você tem atendimentos próximos no Morumbi. Deseja otimizar sua rota agora?`);
  }, [profile, isPhysio, authLoading, user]);

  if (authLoading) return (
    <div className="min-h-screen pt-20 bg-[#0B1120] px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex items-center gap-6">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-4 md:pt-8 pb-12 bg-background relative overflow-hidden transition-colors duration-500">
      {/* Camada de Textura e Brilho de Fundo Premium */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 md:space-y-10 relative z-10">
        {/* Cabeçalho de Boas-vindas Premium Dark */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 backdrop-blur-3xl p-4 md:p-5 rounded-[2rem] border border-white/10 shadow-2xl shadow-blue-900/20 relative overflow-hidden">
          {/* Efeito de brilho interno */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] -mr-24 -mt-24 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {!profile ? (
              <div className="w-16 h-16 bg-slate-800 animate-pulse rounded-full border-4 border-white/5" />
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <img 
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                  alt={profile.nome_completo}
                  className="relative w-16 h-16 rounded-full border-4 border-white/10 shadow-2xl object-cover"
                />
                {/* Ponto de Status fixado na borda */}
                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-[2px] border-[#0B1120] rounded-full shadow-lg z-10" />
              </div>
            )}
            
            <div className="space-y-0.5 flex-1">
              <div className="flex flex-col gap-0">
                <h1 className="text-lg md:text-xl font-black text-white tracking-tight opacity-90">
                  {getGreeting()},
                </h1>
                
                {!profile ? (
                  <span className="text-xl font-black animate-pulse text-slate-600">Conectando...</span>
                ) : (
                  <div className="flex flex-col leading-[0.9] pt-0.5">
                    {/* Título Dr. se for fisioterapeuta */}
                    {isPhysio && (
                      <span className="text-base md:text-lg font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter mb-0">
                        Dr.
                      </span>
                    )}
                    
                    {/* Nome Completo Empilhado Verticalmente */}
                    <div className="flex flex-col">
                      {profile.nome_completo.split(' ').map((namePart, idx, arr) => (
                        <div key={idx} className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter break-all sm:break-normal">
                            {namePart}
                          </span>
                          
                          {/* Emblema PRO e Emoji no final do último nome */}
                          {idx === arr.length - 1 && (
                            <div className="flex items-center gap-1.5 pb-0.5 self-end mb-0.5">
                              {isPro && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-[8px] font-black text-white uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 border border-white/20 whitespace-nowrap">
                                  <Crown size={7} fill="currentColor" />
                                  Pro
                                </span>
                              )}
                              {isPhysio ? (
                                <span className="badge-physio !px-2 !py-0.5 !text-[9px] whitespace-nowrap">
                                  Fisioterapeuta
                                </span>
                              ) : (
                                <span className="badge-patient !px-2 !py-0.5 !text-[9px] whitespace-nowrap">
                                  Paciente
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-slate-400 font-bold text-[10px] tracking-wide max-w-md">
                {isPhysio 
                  ? "Bem-vindo a FisioCareHub, a sua plataforma de performance" 
                  : "Bem-vindo a FisioCareHub, sua plataforma de reabilitação domiciliar e performance"
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-start lg:items-end gap-3 mt-2 lg:mt-0">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-[8px] uppercase tracking-[0.2em] bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
              <Sparkles size={10} className="text-sky-500 animate-pulse" />
              {isPhysio ? 'Gestão Profissional' : 'Sua Jornada de Saúde'}
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-white/10 transition-all border border-white/5 shadow-inner group">
                <Bell size={18} className="group-hover:animate-swing" />
              </button>
              {!isPhysio && (
                <button 
                  onClick={() => navigate('/triage')}
                  className="btn-primary-compact !px-4 !py-2 !text-xs !bg-sky-500 hover:!bg-sky-600"
                >
                  <Plus size={14} className="stroke-[3px]" />
                  Nova Triagem
                </button>
              )}
            </div>
          </div>
        </header>
        
        {/* Admin Special Preview Notification */}
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-1 bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 rounded-2xl shadow-xl shadow-sky-900/30"
          >
            <div className="bg-card rounded-[0.95rem] p-5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-600/10 blur-[80px] -mr-24 -mt-24 rounded-full group-hover:bg-sky-600/20 transition-all duration-1000"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-sky-600/20 rounded-xl flex items-center justify-center text-sky-400 border border-sky-500/30">
                  <Smartphone size={28} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight mb-1">Novas Interfaces Mobile</h2>
                  <p className="text-slate-400 text-xs font-medium max-w-md">
                    Criei a visualização side-by-side (Paciente vs Fisioterapeuta) com os elementos fotorrealistas e wireframes que você solicitou.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => navigate('/preview')}
                className="relative z-10 px-6 py-3 bg-white text-slate-950 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-2 group/btn"
              >
                VER PRÉVIA AGORA
                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Actions - Moved to Top for Physio */}
        {isPhysio && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <Link to="/patients" className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-sky-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-sky-500/20 shadow-xl shadow-sky-900/10">
              <Users className="mx-auto text-slate-400 group-hover:text-sky-400 transition-colors" size={24} />
              <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-sky-400 tracking-widest">Pacientes</p>
            </Link>
            <Link to="/agenda" className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-sky-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-sky-500/20 shadow-xl shadow-sky-900/10">
              <Calendar className="mx-auto text-slate-400 group-hover:text-sky-400 transition-colors" size={24} />
              <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-sky-400 tracking-widest">Agenda</p>
            </Link>
            <Link to="/exercises" className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-emerald-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-emerald-500/20 shadow-xl shadow-emerald-900/10">
              <Activity className="mx-auto text-slate-400 group-hover:text-emerald-400 transition-colors" size={24} />
              <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-emerald-400 tracking-widest">Exercícios</p>
            </Link>
            <Link to="/records" className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-rose-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-rose-500/20 shadow-xl shadow-rose-900/10">
              <FileText className="mx-auto text-slate-400 group-hover:text-rose-400 transition-colors" size={24} />
              <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-rose-400 tracking-widest">Prontuários</p>
            </Link>
            <button 
              onClick={() => {
                const element = document.getElementById('financial-section');
                element?.scrollIntoView({ behavior: 'smooth' });
                // We'll add a way to trigger the tab switch too
                window.dispatchEvent(new CustomEvent('open-financial-services'));
              }}
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-blue-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-blue-500/20 shadow-xl shadow-blue-900/10"
            >
              <DollarSign className="mx-auto text-slate-400 group-hover:text-blue-400 transition-colors" size={24} />
              <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-400 tracking-widest">Financeiro</p>
            </button>
          </motion.div>
        )}

      {/* Next Step Section for Patients */}
      {!isPhysio && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAppointments.filter(a => new Date(a.data_servico) >= new Date()).length > 0 ? (
              <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-sky-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-sky-900/40">
                    <span className="text-[9px] font-black uppercase opacity-80">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'short' })}</span>
                    <span className="text-xl font-black">{new Date(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico + 'T12:00:00').getDate()}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-sky-400 uppercase tracking-[0.15em] mb-0.5">Próxima Consulta</p>
                    <p className="text-lg font-black text-white tracking-tight">
                      {recentAppointments.find(a => new Date(a.data_servico) >= new Date()).fisioterapeuta?.nome_completo}
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      {formatHourBR(recentAppointments.find(a => new Date(a.data_servico) >= new Date()).data_servico)} • <span className="text-sky-400">Presencial</span>
                    </p>
                  </div>
                </div>
              <button onClick={() => navigate('/appointments')} className="p-3 bg-white/5 text-slate-400 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/5 text-slate-400 rounded-xl flex items-center justify-center shadow-inner border border-white/5">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-lg font-black text-white tracking-tight">Agendar Consulta</p>
                  <p className="text-xs text-slate-400 font-bold">Você não tem consultas pendentes.</p>
                </div>
              </div>
              <button onClick={() => navigate('/triage')} className="px-5 py-2.5 bg-sky-500 text-white rounded-xl font-bold text-xs hover:bg-sky-400 transition-all shadow-lg shadow-sky-900/40">
                Agendar
              </button>
            </div>
          )}

          {/* Quick Stats Summary (Compact) */}
          <div className="bg-card backdrop-blur-xl p-5 rounded-2xl text-white shadow-2xl border border-white/10 flex items-center justify-around relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-center relative z-10">
              <p className="text-2xl font-black text-white">{stats.records > 0 ? '75%' : '0%'}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Melhora</p>
            </div>
            <div className="w-px h-8 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-2xl font-black text-white">{stats.appointments}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Sessões</p>
            </div>
            <div className="w-px h-8 bg-white/10 relative z-10" />
            <div className="text-center relative z-10">
              <p className="text-2xl font-black text-white">{stats.records > 0 ? '12' : '0'}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Treinos</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dashboard (Moved to top for patients) */}
      {!isPhysio && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight">Evolução da <span className="text-sky-400 italic">Dor</span></h2>
            {stats.records > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20">
                <TrendingUp size={10} />
                +75% de Melhora
              </div>
            )}
          </div>
          <div className="premium-card">
            <EvolutionCharts melhora={stats.records > 0 ? 75 : 0} />
          </div>
        </div>
      )}

      {/* Histórico de Atividades */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Histórico de <span className="text-blue-400 italic">Atividades</span></h2>
        </div>
        <div className="premium-card">
          <ActivityTimeline activities={activities} />
        </div>
      </div>

      {/* Quick Stats Grid - Only for Physio or if not empty for patients */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Consultas', value: stats.appointments, icon: Calendar, color: 'sky', trend: '+12%', show: isPhysio || stats.appointments > 0 },
          { label: isPhysio ? 'Pacientes' : 'Fisioterapeutas', value: stats.patients, icon: Users, color: 'emerald', trend: '+5%', show: isPhysio || stats.patients > 0 },
          { label: 'Prontuários', value: stats.records, icon: FileText, color: 'indigo', trend: '+8%', show: isPhysio || stats.records > 0 },
          { label: 'Triagens', value: stats.pendingTriages, icon: Activity, color: 'rose', trend: '0%', show: isPhysio || stats.pendingTriages > 0 },
        ].filter(s => s.show).map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="premium-card group relative overflow-hidden !p-4 md:!p-6"
          >
            <div className={cn(
              "absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-[0.05] transition-transform group-hover:scale-110",
              stat.color === 'sky' ? "bg-sky-600" : 
              stat.color === 'emerald' ? "bg-emerald-600" :
              stat.color === 'indigo' ? "bg-indigo-600" : "bg-rose-600"
            )} />
            
            <div className="flex justify-between items-start mb-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all border border-white/5",
                stat.color === 'sky' && "bg-sky-500/10 text-sky-400 shadow-sky-900/20",
                stat.color === 'emerald' && "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20",
                stat.color === 'indigo' && "bg-indigo-500/10 text-indigo-400 shadow-indigo-900/20",
                stat.color === 'rose' && "bg-rose-500/10 text-rose-400 shadow-rose-900/20",
              )}>
                <stat.icon size={20} />
              </div>
              {stat.trend !== '0%' && (
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-tighter",
                  stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                  {stat.trend}
                </div>
              )}
            </div>
            
            <div>
              <p className="text-xl font-black text-white tracking-tight">{stat.value}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isPhysio && (
        <div className="premium-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-black text-white tracking-tight">Buscar Pacientes</h3>
            <div className="relative w-full max-w-md">
              <div 
                className="absolute flex items-center pointer-events-none z-20"
                style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
              >
                {searching ? <Loader2 className="animate-spin text-sky-500" size={18} /> : <Users size={18} style={{ color: '#94a3b8' }} />}
              </div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Nome ou e-mail..."
                className="input-compact pr-4 !pl-[60px]"
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              {searchResults.map((patient) => (
                <div 
                  key={patient.id} 
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                    selectedPatientId === patient.id ? "bg-sky-600/10 border-sky-500 shadow-lg shadow-sky-900/20" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={patient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.id}`}
                      alt={patient.nome_completo}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10"
                    />
                    <div>
                      <p className={cn("text-sm font-bold transition-colors", selectedPatientId === patient.id ? "text-sky-400" : "text-white group-hover:text-sky-400")}>
                        {patient.nome_completo}
                      </p>
                      <p className="text-[10px] text-slate-400">{patient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPatientId === patient.id && (
                      <div className="px-2 py-0.5 bg-sky-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                        Selecionado
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/physio/${patient.id}`);
                      }}
                      className="p-2 bg-white/10 text-sky-400 rounded-lg shadow-sm hover:bg-sky-600 hover:text-white transition-all border border-white/5"
                    >
                      <User size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {patientSearch.length >= 3 && searchResults.length === 0 && !searching && (
            <p className="text-center text-slate-500 py-2 text-xs">Nenhum paciente encontrado para "{patientSearch}"</p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Consultas <span className="text-blue-400 italic">Recentes</span></h2>
            <Link 
              to={isPhysio ? "/agenda?view=all" : "/appointments"} 
              className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>

          <div className="premium-card !p-0 overflow-hidden">
            {apptsLoading ? (
              <div className="p-4">
                <ListSkeleton count={3} />
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <Calendar size={20} />
                </div>
                <p className="text-slate-500 text-[10px] font-medium">Nenhuma consulta agendada.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentAppointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    onClick={() => navigate(isPhysio ? `/agenda?agendamento_id=${appt.id}` : `/appointments?id=${appt.id}`)}
                    className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600/10 text-blue-400 rounded-lg flex items-center justify-center font-black text-xs border border-blue-500/20">
                          {new Date(appt.data + 'T12:00:00').getDate()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {isPhysio ? (appt.nome_paciente || appt.paciente?.nome_completo || 'Paciente') : (appt.nome_fisioterapeuta || appt.fisioterapeuta?.nome_completo || 'Fisioterapeuta')}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={9} /> 
                              {appt.hora || formatHourBR(appt.data_servico)}
                            </span>
                          <span className="w-0.5 h-0.5 bg-white/10 rounded-full"></span>
                          <span className={cn(
                            "capitalize px-1.5 py-0.5 rounded text-[8px] font-black",
                            appt.status === 'confirmado' ? "bg-emerald-500/20 text-emerald-400" :
                            appt.status === 'pendente' ? "bg-amber-500/20 text-amber-400" :
                            "bg-slate-500/20 text-slate-400"
                          )}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-1 text-slate-500 group-hover:text-blue-400 group-hover:bg-white/5 rounded-lg transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Triages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                {isPhysio ? (
                  <>Triagens <span className="text-indigo-400 italic">Inteligentes</span></>
                ) : (
                  <>Suas <span className="text-indigo-400 italic">Triagens</span></>
                )}
              </h2>
              <Link 
                to={isPhysio ? "/records" : "/triage"} 
                className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
              >
                {isPhysio ? "Ver todas" : "Ver histórico"} <ChevronRight size={12} />
              </Link>
            </div>

            <div className="premium-card !p-0 overflow-hidden">
              {recentTriages.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <BrainCircuit size={20} />
                  </div>
                  <p className="text-slate-500 text-[10px] font-medium">Nenhuma triagem recente.</p>
                  {!isPhysio && (
                    <button 
                      onClick={() => navigate('/triage')}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                    >
                      Fazer triagem
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentTriages.map((triage) => (
                    <div key={triage.id} className="p-3.5 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={isPhysio ? (triage.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${triage.paciente_id}`) : (profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)}
                            alt={isPhysio ? triage.paciente?.nome_completo : profile?.nome_completo}
                            className="w-9 h-9 rounded-lg object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">
                              {isPhysio ? triage.paciente?.nome_completo : "Sua Avaliação"}
                            </p>
                            <p className="text-[9px] text-slate-500 font-medium">{formatDate(triage.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[7px] font-black uppercase tracking-widest border border-indigo-500/20">
                            {triage.classificacao}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                            triage.gravidade === 'grave' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}>
                            {triage.gravidade}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-[9px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><MapPin size={10} /> {triage.regiao_dor}</span>
                          <span className="flex items-center gap-1"><Thermometer size={10} /> Dor {triage.escala_dor}/10</span>
                          {triage.red_flag && (
                            <span className="flex items-center gap-1 text-rose-400 font-bold">
                              <AlertTriangle size={10} /> Red Flag!
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => navigate(isPhysio ? `/records?patient=${triage.paciente_id}` : '/triage')}
                          className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all"
                        >
                          <ChevronRight size={16} />
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
          {isPhysio && <ClinicalAssistant isPhysio={isPhysio} />}
          {!isPhysio && (
            <motion.div 
            layout
            onClick={() => setIsAiExpanded(!isAiExpanded)}
            className={cn(
              "bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 p-6 rounded-2xl text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden border border-white/10 cursor-pointer group",
              isAiExpanded ? "lg:col-span-1 h-auto" : "h-fit"
            )}
          >
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                  <BrainCircuit size={20} className="animate-bounce" />
                </div>
                {isAiExpanded && (
                  <button className="text-white/60 hover:text-white transition-colors">
                    <ChevronRight size={18} className="rotate-90" />
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  Assistente <span className="text-blue-200">{isPhysio ? 'Clínico' : 'Viva'}</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-blue-50/90 text-sm leading-relaxed font-medium">
                  {aiMessage}
                </p>
              </div>

              {isAiExpanded && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-3 border-t border-white/10"
                >
                  <div className="bg-black/20 backdrop-blur-xl p-3 rounded-xl space-y-2">
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest">Sugestões</p>
                    <div className="flex flex-wrap gap-1.5">
                      {isPhysio ? (
                        <>
                          <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold transition-all border border-white/10">Relatório SOAP</button>
                          <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold transition-all border border-white/10">Resumir Dia</button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => navigate('/treinos')}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold transition-all border border-white/10"
                          >
                            Treino de Hoje
                          </button>
                          <button 
                            onClick={() => navigate('/diario')}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold transition-all border border-white/10"
                          >
                            Relatar Dor
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Pergunte algo..." 
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button className="p-2 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-lg">
                      <ArrowUpRight size={18} />
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
                  className="w-full py-3 bg-white text-blue-900 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Iniciar Triagem
                </button>
              )}
            </div>
          </motion.div>
          )}

          {/* Quick Actions - Removed from here as it was moved to top */}
        </div>
      </div>
      {/* New Features Section */}
      <div className="space-y-10">
        {isPhysio ? (
          <>
            {/* Physio Pro Features */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white tracking-tight">Recursos Profissionais</h2>
                <div className="flex items-center gap-2">
                  <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                    <option>Semana</option>
                    <option>Mês</option>
                  </select>
                  {!isPro && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[7px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                      Pro
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <ProGuard variant="full" className="xl:col-span-1 md:col-span-2">
                  <div id="financial-section" className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 relative group h-full">
                    <FinancialDashboard />
                  </div>
                </ProGuard>

                <ProGuard variant="full">
                  <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 relative group h-full">
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[7px] font-black uppercase tracking-widest border border-blue-500/20">
                        <MapPin size={8} />
                        3 Pacientes
                      </div>
                    </div>
                    <RouteOptimizer />
                  </div>
                </ProGuard>

                <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20">
                  <SOAPIntelligentRecord 
                    pacienteId={selectedPatientId || undefined} 
                    onSave={() => {
                      fetchDashboardData(profile);
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Patient Features */}
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20">
                <PainDiary />
              </div>
              <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20">
                <ExerciseChecklist />
              </div>
            </div>
            <div className="space-y-5">
              {/* Quick Actions (2x2 Grid) */}
              <div className="bg-card/50 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 space-y-3.5">
                <h3 className="text-base font-black text-white">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link to="/chat" className="p-3 bg-white/5 rounded-2xl hover:bg-blue-600/10 group transition-all text-center space-y-1 border border-white/5 hover:border-blue-500/20 shadow-sm">
                    <MessageSquare className="mx-auto text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                    <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-blue-400">Chat</p>
                  </Link>
                  <Link to="/treinos" className="p-3 bg-white/5 rounded-2xl hover:bg-emerald-600/10 group transition-all text-center space-y-1 border border-white/5 hover:border-emerald-500/20 shadow-sm">
                    <Activity className="mx-auto text-slate-500 group-hover:text-emerald-400 transition-colors" size={20} />
                    <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-emerald-400">Treinos</p>
                  </Link>
                  <button 
                    onClick={() => window.open(`https://meet.jit.si/FisioCareHub-${profile?.id || 'room'}`, '_blank')}
                    className="p-3 bg-white/5 rounded-2xl hover:bg-sky-600/10 group transition-all text-center space-y-1 border border-white/5 hover:border-sky-500/20 shadow-sm"
                  >
                    <Video className="mx-auto text-slate-500 group-hover:text-sky-400 transition-colors" size={20} />
                    <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-sky-400">Consulta</p>
                  </button>
                  <Link to="/triage" className="p-3 bg-white/5 rounded-2xl hover:bg-indigo-600/10 group transition-all text-center space-y-1 border border-white/5 hover:border-indigo-500/20 shadow-sm">
                    <BrainCircuit className="mx-auto text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
                    <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-indigo-400">Triagem</p>
                  </Link>
                </div>
              </div>

              {/* Gamification Section */}
              <div className="bg-card/50 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 space-y-3.5">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Trophy className="text-amber-500" size={18} />
                  Conquistas
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Bronze', desc: '7 dias ativos', icon: Medal, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', progress: stats.records > 0 ? 100 : 0 },
                    { label: 'Foco', desc: 'Triagem feita', icon: Zap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', progress: stats.pendingTriages > 0 ? 100 : 0 },
                    { label: 'Superação', desc: '50% menos dor', icon: Star, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', progress: stats.records > 5 ? 40 : 0 },
                  ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-all bg-white/5">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border shrink-0", badge.color, badge.progress === 0 && "grayscale opacity-30")}>
                        <badge.icon size={18} />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[11px] font-black text-white">{badge.label}</p>
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">{badge.desc}</p>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
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
      <FloatingHelpMenu />
      {showWelcome && <ApprovalWelcomeModal onClose={() => setShowWelcome(false)} />}
      
      {user && pendingEvaluation && (
        <EvaluationModal
          isOpen={showEvaluation}
          onClose={() => setShowEvaluation(false)}
          appointment={pendingEvaluation}
          userId={user.id}
          onSuccess={() => {
            // Refresh dashboard data to update stats if needed
            fetchDashboardData(profile);
          }}
        />
      )}
    </div>
  </div>
  );
}
