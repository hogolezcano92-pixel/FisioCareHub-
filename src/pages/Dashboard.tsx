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
  Loader2,
  Crown,
  Route,
  BookOpen,
  Wallet
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// New FisioCare Components
import { PainDiary, ExerciseChecklist } from '../components/FisioCare/PatientCare';
import { SOAPIntelligentRecord } from '../components/FisioCare/SOAPRecord';
import { RouteOptimizer } from '../components/FisioCare/RouteOptimizer';
import { FinancialDashboard } from '../components/FisioCare/FinancialDashboard';
import { DigitalLibrary } from '../components/FisioCare/DigitalLibrary';
import ProGuard from '../components/ProGuard';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    records: 0,
    pendingTriages: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const lastLoadedProfileId = useRef<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const fetchStats = useCallback(async (data: any) => {
    if (!data) return;
    setStatsLoading(true);
    try {
      const isPatient = (data.plano || '').toLowerCase() === 'free';
      const roleField = isPatient ? 'paciente_id' : 'fisio_id';
      const otherRoleField = isPatient ? 'fisio_id' : 'paciente_id';
      
      const [apptsCount, recsCount, triagesCount, otherRoles] = await Promise.all([
        supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq(roleField, data.id),
        supabase.from('prontuarios').select('*', { count: 'exact', head: true }).eq(roleField, data.id),
        supabase.from('triagens').select('*', { count: 'exact', head: true }).eq('paciente_id', data.id),
        supabase.from('agendamentos').select(otherRoleField).eq(roleField, data.id)
      ]);

      const uniqueOthers = new Set(otherRoles.data?.map((item: any) => item[otherRoleField])).size;

      setStats({
        appointments: apptsCount.count || 0,
        patients: uniqueOthers || 0,
        records: recsCount.count || 0,
        pendingTriages: triagesCount.count || 0
      });
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchRecentAppointments = useCallback(async (data: any) => {
    if (!data) return;
    setApptsLoading(true);
    try {
      const isPatient = (data.plano || '').toLowerCase() === 'free';
      const roleField = isPatient ? 'paciente_id' : 'fisio_id';
      const { data: appts, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:paciente_id (nome_completo, email, avatar_url),
          fisioterapeuta:fisio_id (nome_completo, email, avatar_url)
        `)
        .eq(roleField, data.id)
        .order('data_servico', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAppointments(appts || []);
    } catch (err) {
      console.error("Erro ao carregar consultas recentes:", err);
    } finally {
      setApptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (profile && lastLoadedProfileId.current !== profile.id) {
      lastLoadedProfileId.current = profile.id;
      fetchStats(profile);
      fetchRecentAppointments(profile);
    }
  }, [user, profile, authLoading, navigate, fetchStats, fetchRecentAppointments]);

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
          .eq('plano', 'free')
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

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparando seu Dashboard...</p>
    </div>
  );

  const isPhysio = (profile?.plano || '').toLowerCase() === 'fisioterapeuta';
  const isPro = profile?.is_pro;

  return (
    <div className="space-y-10 pb-12">
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-[0.3em]">
            <Sparkles size={14} />
            Bem-vindo de volta
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">
            {isPhysio ? (
              <>
                Bem-{profile?.genero === 'female' ? 'vinda' : 'vindo'} {profile?.genero === 'female' ? 'Dra.' : 'Dr.'} {profile?.nome_completo}! 👋
              </>
            ) : (
              <>
                Bem-{profile?.genero === 'female' ? 'vinda' : 'vindo'} Paciente {profile?.nome_completo}! 👋
              </>
            )}
          </h1>
          <p className="text-base text-slate-500 font-medium">
            Aqui está o que está acontecendo com seus atendimentos hoje.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <Bell size={20} />
          </button>
          <button 
            onClick={() => navigate(isPhysio ? '/appointments' : '/triage')}
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
          >
            <Plus size={20} />
            {isPhysio ? 'Nova Consulta' : 'Nova Triagem'}
          </button>
        </div>
      </header>

      {/* Stats Grid - Recipe 1: Data Grid feel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Consultas', value: stats.appointments, icon: Calendar, color: 'blue', trend: '+12%' },
          { label: isPhysio ? 'Pacientes' : 'Fisioterapeutas', value: stats.patients, icon: Users, color: 'emerald', trend: '+5%' },
          { label: 'Prontuários', value: stats.records, icon: FileText, color: 'indigo', trend: '+8%' },
          { label: 'Triagens', value: stats.pendingTriages, icon: Activity, color: 'rose', trend: '-2%' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform group-hover:scale-110",
              stat.color === 'blue' ? "bg-blue-600" : 
              stat.color === 'emerald' ? "bg-emerald-600" :
              stat.color === 'indigo' ? "bg-indigo-600" : "bg-rose-600"
            )} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                stat.color === 'blue' && "bg-blue-50 text-blue-600 shadow-blue-100",
                stat.color === 'emerald' && "bg-emerald-50 text-emerald-600 shadow-emerald-100",
                stat.color === 'indigo' && "bg-indigo-50 text-indigo-600 shadow-indigo-100",
                stat.color === 'rose' && "bg-rose-50 text-rose-600 shadow-rose-100",
              )}>
                <stat.icon size={28} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg",
                stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {stat.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            
            <div className="space-y-1">
              {statsLoading ? (
                <div className="h-10 w-16 bg-slate-100 animate-pulse rounded-lg"></div>
              ) : (
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
              )}
              <p className="text-base font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isPhysio && (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Buscar Pacientes</h3>
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {searching ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <Users className="text-slate-400" size={20} />}
              </div>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
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
                    selectedPatientId === patient.id ? "bg-blue-50 border-blue-200 shadow-md" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={patient.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.id}`}
                      alt={patient.nome_completo}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className={cn("font-bold transition-colors", selectedPatientId === patient.id ? "text-blue-700" : "text-slate-900 group-hover:text-blue-600")}>
                        {patient.nome_completo}
                      </p>
                      <p className="text-sm text-slate-500">{patient.email}</p>
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
                      className="p-3 bg-white text-blue-600 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all"
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Consultas Recentes</h2>
            <Link to="/appointments" className="text-base font-bold text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
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
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                  <Calendar size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhuma consulta agendada.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAppointments.map((appt) => (
                  <div key={appt.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-base">
                        {new Date(appt.data_servico).getDate()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {isPhysio ? appt.paciente?.nome_completo : appt.fisioterapeuta?.nome_completo}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(appt.data_servico).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="capitalize">{appt.status}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/appointments')}
                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & AI Insights */}
        <div className="space-y-8">
          <div className={cn(
            "bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden"
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
                  className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Iniciar Triagem
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/chat" className="p-6 bg-slate-50 rounded-3xl hover:bg-blue-50 group transition-all text-center space-y-2">
                <MessageSquare className="mx-auto text-slate-400 group-hover:text-blue-600 transition-colors" size={28} />
                <p className="text-xs font-black uppercase text-slate-400 group-hover:text-blue-600">Chat</p>
              </Link>
              <Link to="/records" className="p-6 bg-slate-50 rounded-3xl hover:bg-emerald-50 group transition-all text-center space-y-2">
                <FileText className="mx-auto text-slate-400 group-hover:text-emerald-600 transition-colors" size={28} />
                <p className="text-xs font-black uppercase text-slate-400 group-hover:text-emerald-600">Prontuários</p>
              </Link>
              <Link to="/documents" className="p-6 bg-slate-50 rounded-3xl hover:bg-indigo-50 group transition-all text-center space-y-2 relative">
                <Users className="mx-auto text-slate-400 group-hover:text-indigo-600 transition-colors" size={28} />
                <p className="text-xs font-black uppercase text-slate-400 group-hover:text-indigo-600">Documentos</p>
              </Link>
              <Link to="/profile" className="p-6 bg-slate-50 rounded-3xl hover:bg-rose-50 group transition-all text-center space-y-2">
                <Activity className="mx-auto text-slate-400 group-hover:text-rose-600 transition-colors" size={28} />
                <p className="text-xs font-black uppercase text-slate-400 group-hover:text-rose-600">Perfil</p>
              </Link>
            </div>
          </div>
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
                </div>
                <DigitalLibrary />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Patient Features */}
            <div className="space-y-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Seu Plano de Cuidado</h2>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <PainDiary />
                  <DigitalLibrary />
                </div>
                <div className="space-y-8">
                  <ExerciseChecklist />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
