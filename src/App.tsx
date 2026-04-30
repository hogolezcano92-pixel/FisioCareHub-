/**
 * FisioCareHub Frontend
 * Segurança e Conexão (CORS) - Cabeçalhos para AI Studio
 * Access-Control-Allow-Origin: *
 */

import { Routes, Route, Link, useNavigate, useLocation, BrowserRouter, Navigate } from 'react-router-dom';
import { supabase, initSupabase } from './lib/supabase';
import { fetchConfig } from './config/api';
import { useState, useEffect, Component, ErrorInfo, ReactNode, useRef, lazy, Suspense, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  Activity, 
  Crown,
  User, 
  FileText, 
  BrainCircuit, 
  LogOut, 
  LogIn,
  UserPlus,
  Menu, 
  X, 
  Home as HomeIcon,
  LayoutDashboard,
  Stethoscope,
  Calendar as CalendarIcon,
  MessageSquare,
  MessageCircle,
  HelpCircle,
  Phone,
  AlertTriangle,
  FileSignature,
  ShieldCheck,
  Bell,
  Video,
  Loader2,
  Info,
  BookOpen,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';

// i18n
import './i18n/config';
import { useTranslation } from 'react-i18next';

// Components
import NotificationBell from './components/NotificationBell';
import Logo from './components/Logo';
import SplashScreen from './components/SplashScreen';
import Footer from './components/Footer';

// Lazy Components
const FloatingHelpMenu = lazy(() => import('./components/FloatingHelpMenu'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const AguardandoAprovacao = lazy(() => import('./pages/AguardandoAprovacao'));

// Lazy Pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Triage = lazy(() => import('./pages/Triage'));
const Records = lazy(() => import('./pages/Records'));
const Profile = lazy(() => import('./pages/Profile'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Chat = lazy(() => import('./pages/Chat'));
const Documents = lazy(() => import('./pages/Documents'));
const Admin = lazy(() => import('./pages/Admin'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Exercises = lazy(() => import('./pages/Exercises'));
const PatientExercises = lazy(() => import('./pages/PatientExercises'));
const PhysioTriages = lazy(() => import('./pages/PhysioTriages'));
const AppPreview = lazy(() => import('./pages/AppPreview'));
const About = lazy(() => import('./pages/About'));
const Partner = lazy(() => import('./pages/Partner'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Subscription = lazy(() => import('./pages/Subscription'));
const HealthLibrary = lazy(() => import('./pages/HealthLibrary'));
const ConfirmAppointment = lazy(() => import('./pages/ConfirmAppointment'));
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const FindPhysio = lazy(() => import('./pages/FindPhysio'));
const PhysioDashboard = lazy(() => import('./pages/PhysioDashboard'));
const FinanceServiceSettings = lazy(() => import('./pages/FinanceServiceSettings'));
const Telehealth = lazy(() => import('./pages/Telehealth'));
const LibraryMaterialDetail = lazy(() => import('./pages/LibraryMaterialDetail'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
    <Loader2 className="w-12 h-12 text-primary animate-spin" />
    <p className="text-text-muted font-bold uppercase tracking-widest text-xs animate-pulse">Carregando...</p>
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          errorMessage = `Erro no Banco de Dados: ${parsed.error}`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-bg-general flex items-center justify-center p-4 transition-colors duration-300">
          <div className="glass-card p-12 rounded-[3rem] max-w-md w-full text-center">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-3xl font-display font-black text-text-main mb-2 tracking-tight">Ops! Algo deu errado</h2>
            <p className="text-xl text-text-muted mb-8 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-primary text-white rounded-full font-black text-xl hover:bg-primary-hover transition-all shadow-premium"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Force immediate scroll to top on any route change (path or search params)
    // Using behavior: 'auto' to override any CSS smooth scrolling
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
    
    // Fallback for different browsers/containers
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
    document.body.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });

    // Disable browser's default scroll restoration to prevent interference
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, [pathname, search]);

  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg-general flex flex-col items-center justify-center space-y-4 transition-colors duration-300">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-text-muted font-bold uppercase tracking-widest text-xs">Carregando Sistema...</p>
    </div>
  );
}

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // If loading or profile is not yet available but user is logged in, show splash
  if (loading || (user && !profile)) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = profile?.tipo_usuario;
  const isAdmin = userRole === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com';
  const isApproved = profile?.status_aprovacao === 'aprovado';

  // Block unapproved physiotherapists (except for profile and waiting page)
  if (userRole === 'fisioterapeuta' && !isApproved && !isAdmin) {
    if (location.pathname !== '/aguardando-aprovacao' && location.pathname !== '/profile') {
      return <Navigate to="/aguardando-aprovacao" replace />;
    }
  }

  // If approved user tries to access waiting page, send them to dashboard
  if (location.pathname === '/aguardando-aprovacao' && (isApproved || isAdmin || userRole === 'paciente')) {
    return <Navigate to="/dashboard" replace />;
  }

  // If we are on a route that requires specific roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // Special case: If an Admin tries to access the general dashboard, send them to /admin
  if (location.pathname === '/dashboard' && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Special case: If a non-admin tries to access /admin, send them to /dashboard
  if (location.pathname === '/admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function Navbar() {
  const { user, profile, subscription, signOut } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPro = profile?.plano === 'admin' || profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';
  const isApproved = profile?.status_aprovacao === 'aprovado' || profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = useMemo(() => [
    { 
      name: t('nav.home'), 
      path: user ? (profile?.tipo_usuario === 'admin' ? '/admin' : (isApproved || profile?.tipo_usuario === 'paciente' ? '/dashboard' : '/aguardando-aprovacao')) : '/', 
      icon: HomeIcon 
    },
    { name: 'Sobre nós', path: '/sobre', icon: Info },
    { name: 'Biblioteca', path: '/biblioteca', icon: BookOpen },
    { name: 'Encontrar Fisio', path: '/buscar-fisio', icon: Search },
    ...(user ? [
      ...(profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com' 
        ? [{ name: t('nav.admin'), path: '/admin', icon: ShieldCheck }] 
        : []),
      
      // Items for Physiotherapists
      ...(profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin' && isApproved ? [
        { name: t('nav.patients'), path: '/patients', icon: User },
        { name: t('nav.agenda'), path: '/agenda', icon: CalendarIcon },
        { name: t('nav.exercises'), path: '/exercises', icon: Activity },
        { name: 'Triagens', path: '/physio/triages', icon: BrainCircuit },
        { name: t('nav.records'), path: '/records', icon: FileText },
        { name: t('nav.documents'), path: '/documents', icon: FileSignature },
        { name: 'Assinatura', path: '/subscription', icon: Crown },
      ] : []),

      // Items for Patients
      ...(profile?.tipo_usuario === 'paciente' ? [
        { name: t('nav.appointments'), path: '/appointments', icon: CalendarIcon },
        { name: t('nav.records'), path: '/records', icon: FileText },
        { name: t('nav.documents'), path: '/documents', icon: FileSignature },
        { name: t('nav.triage'), path: '/triage', icon: BrainCircuit },
      ] : []),

      // Common Items
      ...(isApproved || profile?.tipo_usuario === 'paciente' ? [
        { name: t('nav.chat'), path: '/chat', icon: MessageSquare },
      ] : []),
      ...(isApproved || profile?.tipo_usuario === 'paciente' || profile?.tipo_usuario === 'admin' ? [
        { name: t('nav.profile'), path: '/profile', icon: User },
      ] : []),
    ] : [])
  ], [user, profile, isApproved, t]);

  return (
    <nav className="bg-background/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="group transition-transform active:scale-95">
              <Logo variant="light" size="sm" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.filter(item => !(['/login', '/register'].includes(item.path) && user)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-black transition-all group",
                    isActive 
                      ? "text-white" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={16} className={cn("transition-transform group-hover:scale-110", isActive ? "text-blue-400" : "text-slate-500")} />
                  <span className="hidden lg:inline">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-blue-600/10 border border-blue-500/20 rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
            
            {user ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                <Link to="/profile" className="flex items-center gap-3 group p-1 pr-3 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="relative">
                    <img 
                      src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                      className="w-9 h-9 rounded-xl object-cover border border-white/10 group-hover:border-blue-500 transition-all"
                      alt="profile"
                    />
                    {isPro && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-950">
                        <Crown size={8} className="text-slate-950" />
                      </div>
                    )}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-[13px] font-black text-white leading-tight">
                      {profile?.tipo_usuario === 'fisioterapeuta' ? (profile?.genero === 'female' ? 'Dra. ' : 'Dr. ') : ''}
                      {(profile?.nome_completo || '').split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                      {isPro ? 'Premium' : 'Free'}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title={t('nav.logout')}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-4">
                <Link 
                  to="/login" 
                  className="px-5 py-2.5 text-[13px] font-black text-slate-300 hover:text-white transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-50 text-white hover:text-blue-600 rounded-xl text-[13px] font-black transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-primary p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950 border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-black transition-all",
                    location.pathname === item.path 
                      ? "bg-blue-600/10 text-white border border-blue-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={20} className={location.pathname === item.path ? "text-blue-400" : "text-slate-500"} />
                  {item.name}
                </Link>
              ))}
              
              {user ? (
                <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <User size={20} className="text-slate-500" />
                    {t('nav.profile')}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-black text-rose-400 hover:bg-rose-500/10 transition-all text-left"
                  >
                    <LogOut size={20} />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl text-base font-black text-white bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                  >
                    <LogIn size={20} className="text-blue-400" />
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl text-base font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <UserPlus size={20} />
                    Começar Agora
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NotificationHandler() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchLatestNotification = async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return;
      }

      if (!isInitialLoad.current && data && data.length > 0) {
        const notification = data[0];
        const createdAt = new Date(notification.created_at).getTime();
        
        if (Date.now() - createdAt < 10000) {
          playSound();
          toast.info(notification.titulo, {
            description: notification.mensagem,
            action: notification.link ? {
              label: "Ver",
              onClick: () => window.location.href = notification.link
            } : undefined
          });
        }
      }
    };

    const channel = supabase
      .channel(`notificacoes_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[Realtime] Global notification received:', payload);
        if (!isInitialLoad.current) {
          const notification = payload.new;
          playSound();
          toast.info(notification.titulo, {
            description: notification.mensagem,
            action: notification.link ? {
              label: "Ver",
              onClick: () => window.location.href = notification.link
            } : undefined
          });
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Global notification subscription status:', status);
      });

    // Listener Global para Agendamentos (Realtime)
    const appointmentsChannel = supabase
      .channel(`agendamentos_realtime_${user.id}`)
      // Escuta novos agendamentos onde o usuário é o fisioterapeuta
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agendamentos',
        filter: `fisio_id=eq.${user.id}`
      }, (payload) => {
        console.log('[Realtime] New appointment (as physio):', payload);
        if (!isInitialLoad.current) {
          playSound();
          toast.success("Novo Agendamento", {
            description: "Você recebeu uma nova solicitação de consulta."
          });
        }
      })
      // Escuta novos agendamentos onde o usuário é o paciente
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agendamentos',
        filter: `paciente_id=eq.${user.id}`
      }, (payload) => {
        console.log('[Realtime] New appointment (as patient):', payload);
        if (!isInitialLoad.current) {
          playSound();
          toast.success("Agendamento Registrado", {
            description: "Sua solicitação de consulta foi enviada com sucesso."
          });
        }
      })
      // Escuta atualizações em agendamentos existentes
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'agendamentos'
      }, (payload) => {
        console.log('[Realtime] Appointment update received:', payload);
        if (!isInitialLoad.current) {
          const record = payload.new as any;
          if (record && (record.paciente_id === user.id || record.fisio_id === user.id)) {
            playSound();
            toast.info("Agendamento Atualizado", {
              description: `O status do agendamento foi alterado para: ${record.status}`
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Appointments subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user]);

  return null;
}


function HeaderObserver() {
  const location = useLocation();
  
  useEffect(() => {
    const updateHeaderHeight = () => {
      // Find the currently active fixed or sticky header
      // We look for elements that are likely headers and visible
      const headers = document.querySelectorAll('header, nav.sticky, nav.fixed');
      let activeHeader: HTMLElement | null = null;
      
      // Filter for visible headers that are at the top and FIXED
      for (const h of Array.from(headers) as HTMLElement[]) {
        const rect = h.getBoundingClientRect();
        const style = window.getComputedStyle(h);
        const isFixed = style.position === 'fixed';
        
        if (isFixed && rect.top <= 5 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
          activeHeader = h;
          break; // Usually only one fixed header at top
        }
      }

      if (activeHeader) {
        const height = activeHeader.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      } else {
        document.documentElement.style.setProperty('--header-height', '0px');
      }
    };

    // Run on mount and location change
    updateHeaderHeight();
    
    // Also run on resize
    window.addEventListener('resize', updateHeaderHeight);
    
    // Observer for dynamic changes (like mobile menu opening affecting header height or visibility)
    const observer = new MutationObserver(updateHeaderHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
}

function AppContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isPatientArea = useMemo(() => user && profile?.tipo_usuario === 'paciente', [user, profile]);
  const isPhysioArea = useMemo(() => user && profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin', [user, profile]);
  const isAdminArea = useMemo(() => user && (profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com'), [user, profile]);
  const isAuthPage = ['/login', '/register', '/reset-password'].includes(location.pathname);
  const isLandingPage = location.pathname === '/' || location.pathname === '/home';
  const isAdminPage = useMemo(() => location.pathname.startsWith('/admin') || location.pathname === '/preview', [location.pathname]);

  const isApproved = profile?.status_aprovacao === 'aprovado';
  const isWaitingPage = location.pathname === '/aguardando-aprovacao';
  
  const showSidebar = useMemo(() => 
    user && !isLandingPage && !isAuthPage && location.pathname !== '/preview' && !isAdminPage && !isWaitingPage && (isApproved || isAdminArea || isPatientArea),
    [user, isLandingPage, isAuthPage, location.pathname, isAdminPage, isWaitingPage, isApproved, isAdminArea, isPatientArea]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-bg-general font-sans text-text-main flex transition-colors duration-300">
      <HeaderObserver />
      <ScrollToTop />
      <Toaster position="top-right" richColors closeButton />
      
      <ErrorBoundary>
        <Suspense fallback={null}>
          <FloatingHelpMenu hideButton={!isLandingPage || !!user} />
        </Suspense>
        <NotificationHandler />
        
        <Suspense fallback={null}>
          {showSidebar && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
        </Suspense>

        <div className="flex-1 flex flex-col min-w-0 bg-bg-general min-h-screen pt-header">
          {!showSidebar && !isAdminPage && !isWaitingPage ? <Navbar /> : (showSidebar && (
            <header className="lg:hidden bg-background/80 backdrop-blur-md border-b border-white/10 fixed top-0 left-0 right-0 z-[45] px-4 sm:px-6 h-16 flex items-center justify-between pt-[env(safe-area-inset-top)] min-h-[4rem] w-full shadow-lg">
              <Logo variant="light" size="sm" />
              <div className="flex items-center gap-4">
                <NotificationBell />
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-300 hover:text-primary transition-colors rounded-xl hover:bg-white/5"
                >
                  <Menu size={24} />
                </button>
              </div>
            </header>
          ))}

          <main className={cn(
            "flex-1 w-full flex flex-col min-w-0 bg-background rounded-t-[20px] shadow-2xl relative z-10",
            location.pathname === '/chat' || showSidebar || isAdminPage || isWaitingPage ? "max-w-none" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          )}>
            <div className={cn(
              "flex-1 w-full",
              !showSidebar && !isAdminPage && !isWaitingPage && location.pathname !== '/chat' && "py-4 md:py-8",
              showSidebar && location.pathname !== '/chat' && "p-4 md:p-8 lg:p-10"
            )}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/aguardando-aprovacao" element={
                    <ProtectedRoute>
                      <AguardandoAprovacao />
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/triage" element={<ProtectedRoute allowedRoles={['paciente']}><Triage /></ProtectedRoute>} />
                  <Route path="/triagem-ia" element={<ProtectedRoute allowedRoles={['paciente']}><Triage /></ProtectedRoute>} />
                  <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/area-paciente" element={<ProtectedRoute allowedRoles={['paciente']}><Profile /></ProtectedRoute>} />
                  <Route path="/appointments" element={<ProtectedRoute allowedRoles={['paciente']}><Appointments /></ProtectedRoute>} />
                  <Route path="/patients" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><Patients /></ProtectedRoute>} />
                  <Route path="/patients/:id" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><PatientDetails /></ProtectedRoute>} />
                  <Route path="/agenda" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><Agenda /></ProtectedRoute>} />
                  <Route path="/exercises" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><Exercises /></ProtectedRoute>} />
                  <Route path="/patient/exercises" element={<ProtectedRoute allowedRoles={['paciente']}><PatientExercises /></ProtectedRoute>} />
                  <Route path="/physio/triages" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><PhysioTriages /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                  <Route path="/subscription" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><Subscription /></ProtectedRoute>} />
                  <Route path="/dashboard/assinatura" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><Subscription /></ProtectedRoute>} />
                  <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
                  <Route path="/preview" element={<ProtectedRoute allowedRoles={['admin']}><AppPreview /></ProtectedRoute>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/sobre" element={<About />} />
                  <Route path="/partner" element={<Partner />} />
                  <Route path="/seja-parceiro" element={<Partner />} />
                  <Route path="/patient/library" element={<ProtectedRoute allowedRoles={['paciente']}><HealthLibrary /></ProtectedRoute>} />
                  <Route path="/agendamento/confirmar" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><ConfirmAppointment /></ProtectedRoute>} />
                  <Route path="/physio/:id" element={<ProtectedRoute><ProfessionalProfile /></ProtectedRoute>} />
                  <Route path="/pagamento/:id" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
                  <Route path="/termos" element={<Terms />} />
                  <Route path="/privacidade" element={<Privacy />} />
                  <Route path="/biblioteca" element={<HealthLibrary />} />
                  <Route path="/biblioteca/:slug" element={<LibraryMaterialDetail />} />
                  <Route path="/buscar-fisio" element={<FindPhysio />} />
                  <Route path="/fisioterapeuta" element={<FindPhysio />} />
                  <Route path="/dashboard/fisio" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><PhysioDashboard /></ProtectedRoute>} />
                  <Route path="/finance/settings" element={<ProtectedRoute allowedRoles={['fisioterapeuta']}><FinanceServiceSettings /></ProtectedRoute>} />
                  <Route path="/telehealth" element={<ProtectedRoute><Telehealth /></ProtectedRoute>} />
                </Routes>
              </Suspense>
            </div>

            {/* Footer Unificado */}
            {!isAdminPage && location.pathname !== '/chat' && <Footer />}
          </main>
        </div>
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      console.log("Iniciando aplicação...");
      const timeoutId = setTimeout(() => {
        console.warn("Inicialização demorou demais, forçando carregamento...");
        setConfigLoaded(true);
      }, 4000);

      try {
        await fetchConfig();
        initSupabase();
        
        clearTimeout(timeoutId);
        setConfigLoaded(true);
        console.log("Aplicação inicializada com sucesso.");
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("Erro na inicialização:", err);
        setError(err.message || "Erro ao carregar configurações do sistema.");
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (configLoaded) {
      const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
      setShowSplash(false);
    }
  }, [configLoaded]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-sky-100">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Erro de Inicialização</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-sky-500 text-white rounded-full font-black">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash ? (
        <SplashScreen />
      ) : showOnboarding ? (
        <Suspense fallback={<SplashScreen />}>
          <Onboarding onComplete={handleOnboardingComplete} />
        </Suspense>
      ) : (
        <div className="block">
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<SplashScreen />}>
                <AppContent />
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </div>
      )}
    </>
  );
}
