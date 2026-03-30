import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, doc, getCountFromServer, updateDoc } from 'firebase/firestore';
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
  Lock
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { invokeFunction } from '../lib/supabase';

export default function Dashboard() {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    records: 0,
    pendingTriages: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [apptsLoading, setApptsLoading] = useState(true);

  const { isPro, plan: currentPlan, status: subStatus, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      // Handle Stripe Success
      const sessionId = searchParams.get('session_id');
      const planId = searchParams.get('plan_id');

      if (sessionId && planId) {
        const updateSubscription = async () => {
          try {
            const planType = planId === 'pro' ? 'pro' : 'basic';
            const billingCycle = 'monthly';
            
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);

            const subscriptionData: any = {
              plan: planType,
              status: 'active',
              expiryDate: expiryDate.toISOString(),
              billingCycle,
              lastSessionId: sessionId
            };

            if (planType === 'pro') {
              subscriptionData.trialStartDate = new Date().toISOString();
            }

            await updateDoc(doc(db, 'users', user.uid), {
              subscription: subscriptionData
            });
            toast.success("Assinatura confirmada com sucesso!");
            // Clear search params
            navigate('/dashboard', { replace: true });
          } catch (err) {
            console.error("Erro ao atualizar assinatura:", err);
            toast.error("Erro ao processar confirmação de pagamento.");
          }
        };
        updateSubscription();
      }

      // Real-time user data
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setUserLoading(false);
          
          // Fetch stats once user data (role) is available
          fetchStats(data);
          fetchRecentAppointments(data);
        } else {
          setUserLoading(false);
          setStatsLoading(false);
          setApptsLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setUserLoading(false);
        setStatsLoading(false);
        setApptsLoading(false);
      });

      const fetchStats = async (data: any) => {
        setStatsLoading(true);
        try {
          const roleField = data?.role === 'patient' ? 'patientId' : 'physioId';
          
          // Use getCountFromServer for better performance on large collections
          const [apptsCount, recsCount, triagesCount] = await Promise.all([
            getCountFromServer(query(collection(db, 'appointments'), where(roleField, '==', user.uid))),
            getCountFromServer(query(collection(db, 'records'), where(roleField, '==', user.uid))),
            getCountFromServer(query(collection(db, 'triages'), where('patientId', '==', user.uid)))
          ]);

          setStats({
            appointments: apptsCount.data().count,
            patients: data?.role === 'physiotherapist' ? 12 : 1,
            records: recsCount.data().count,
            pendingTriages: triagesCount.data().count
          });
        } catch (err) {
          console.error("Erro ao carregar estatísticas:", err);
        } finally {
          setStatsLoading(false);
        }
      };

      const fetchRecentAppointments = async (data: any) => {
        setApptsLoading(true);
        try {
          const roleField = data?.role === 'patient' ? 'patientId' : 'physioId';
          const qAppts = query(
            collection(db, 'appointments'),
            where(roleField, '==', user.uid),
            orderBy('date', 'desc'),
            limit(5)
          );
          const recentApptsSnap = await getDocs(qAppts);
          setRecentAppointments(recentApptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Erro ao carregar consultas recentes:", err);
        } finally {
          setApptsLoading(false);
        }
      };

      return () => unsubUser();
    } else if (!authLoading) {
      setUserLoading(false);
      setStatsLoading(false);
      setApptsLoading(false);
    }
  }, [user, authLoading, searchParams, navigate]);

  if (userLoading) return (
    <div className="flex flex-col items-center justify-center pt-32 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparando seu Dashboard...</p>
    </div>
  );

  const isPhysio = userData?.role === 'physiotherapist';
  const trialStartDate = userData?.subscription?.trialStartDate;

  const getRemainingTrialDays = () => {
    if (!trialStartDate) return 0;
    const start = new Date(trialStartDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - days);
  };

  const remainingDays = getRemainingTrialDays();
  const isTrial = currentPlan === 'pro' && remainingDays > 0;

  const handleManageSubscription = async () => {
    if (!user) return;
    try {
      toast.info("Acessando portal de gerenciamento...");
      const { url } = await invokeFunction('stripe-portal', {
        userId: user.uid,
        userEmail: user.email,
        customerId: userData?.subscription?.stripeCustomerId
      });
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL do portal não recebida.");
      }
    } catch (err: any) {
      console.error("Erro ao acessar portal:", err);
      toast.error(err.message || "Erro ao acessar portal de pagamentos.");
    }
  };

  return (
    <div className="space-y-10 pb-12">
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
                Olá, seja bem-{userData?.gender === 'female' ? 'vinda' : 'vindo'} {userData?.gender === 'female' ? 'Dra.' : 'Dr.'} {userData?.name?.split(' ')[0]}! 👋
              </>
            ) : (
              <>
                Olá paciente {userData?.name?.split(' ')[0]}! 👋
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
                        {new Date(appt.date).getDate()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {appt.service || 'Consulta Geral'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {appt.time}</span>
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
          {/* Subscription Status Card */}
          {isPhysio && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Status da Assinatura</h3>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  subStatus === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {subStatus === 'active' ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                  <span className="text-base font-bold text-slate-400">Plano</span>
                  <span className="text-base font-black text-slate-900 capitalize">{currentPlan}</span>
                </div>
                
                {isTrial && (
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-base font-bold text-slate-400">Teste Grátis</span>
                    <span className="text-base font-black text-blue-600">{remainingDays} dias restantes</span>
                  </div>
                )}

                {currentPlan === 'basic' ? (
                  <button 
                    onClick={() => navigate('/dashboard/assinatura')}
                    className="w-full py-5 bg-blue-50 text-blue-600 rounded-2xl font-black text-base hover:bg-blue-100 transition-all"
                  >
                    Teste o Plano Pro 30 dias grátis
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-base font-medium text-slate-500 text-center">
                      Você está inscrito no Plano Pro.
                    </p>
                    <button 
                      onClick={handleManageSubscription}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-base hover:bg-slate-800 transition-all"
                    >
                      Gerenciar Assinatura
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marketing Card */}
          {isPhysio && currentPlan === 'basic' && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black tracking-tight">Experimente o Pro grátis por 30 dias</h3>
                  <p className="text-blue-100 text-sm leading-relaxed font-medium">
                    Receba mais pacientes e desbloqueie todos os recursos profissionais com o Plano Pro. Comece agora com 30 dias grátis!
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Solicitações ilimitadas',
                      'Prioridade no ranking',
                      'Badge de verificado',
                      'Perfil completo',
                      'Maior visibilidade'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs font-bold text-blue-50">
                        <Check size={12} className="text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/assinatura')}
                  className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-xl"
                >
                  Testar Plano Pro
                </button>
              </div>
            </div>
          )}

          <div className={cn(
            "bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden",
            !isPro && "opacity-75 grayscale-[0.5]"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <BrainCircuit size={24} />
                </div>
                {!isPro && (
                  <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                    <Lock size={16} className="text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Assistente IA
                </h3>
                <p className="text-blue-100 text-base leading-relaxed font-medium">
                  {isPro 
                    ? "Você tem 3 pacientes com dores crônicas que não evoluem há 2 semanas. Deseja sugestões de novos protocolos?"
                    : "Desbloqueie o Assistente IA para receber sugestões de protocolos baseadas em evidências."}
                </p>
              </div>
              <button 
                onClick={() => isPro ? navigate('/triage') : navigate('/dashboard/assinatura')}
                className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-base hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isPro ? 'Analisar Casos' : 'Fazer Upgrade'}
              </button>
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
              <Link to="/documents" className={cn(
                "p-6 bg-slate-50 rounded-3xl hover:bg-indigo-50 group transition-all text-center space-y-2 relative",
                !isPro && "opacity-50 grayscale"
              )}>
                {!isPro && <Lock size={12} className="absolute top-2 right-2 text-slate-400" />}
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
    </div>
  );
}
