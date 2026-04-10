/**
 * FisioCareHub Frontend
 * Segurança e Conexão (CORS) - Cabeçalhos para AI Studio
 * Access-Control-Allow-Origin: *
 */

import { Routes, Route, Link, useNavigate, useLocation, BrowserRouter, Navigate } from 'react-router-dom';
import { supabase, initSupabase } from './lib/supabase';
import { fetchConfig } from './config/api';
import { useState, useEffect, Component, ErrorInfo, ReactNode, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  Activity, 
  Crown,
  User, 
  FileText, 
  BrainCircuit, 
  LogOut, 
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
  Loader2
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
import KineAI from './components/KineAI';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';

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
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

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

  if (loading) return <SplashScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.tipo_usuario)) {
    // Redirect to their respective dashboard if they don't have access
    if (profile?.tipo_usuario === 'admin') return <Navigate to="/admin" replace />;
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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { name: t('nav.home'), path: user ? (profile?.tipo_usuario === 'admin' ? '/admin' : '/dashboard') : '/', icon: HomeIcon },
    ...(user ? [
      ...(profile?.tipo_usuario === 'admin' || 
          user?.email?.toLowerCase() === 'hogolezcano92@gmail.com' ? [{ name: t('nav.admin'), path: '/admin', icon: ShieldCheck }] : []),
      
      // Items for Physiotherapists
      ...(profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin' ? [
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
      { name: t('nav.chat'), path: '/chat', icon: MessageSquare },
      { name: t('nav.profile'), path: '/profile', icon: User },
    ] : [
      { name: t('nav.login'), path: '/login', icon: User },
      { name: t('nav.register'), path: '/register', icon: Stethoscope },
    ])
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="group">
              <Logo />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {navItems.map((item) => (
              <Link
                key={`${item.name}-${item.path}`}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                  location.pathname === item.path 
                    ? "bg-primary text-white shadow-premium" 
                    : "text-text-main hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon size={18} />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            ))}
            {user && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-border-soft">
                <Link to="/profile" className="flex items-center gap-3 group">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-black text-text-main leading-none">
                      {profile?.tipo_usuario === 'fisioterapeuta' ? (profile?.genero === 'female' ? 'Dra. ' : 'Dr. ') : ''}
                      {(profile?.nome_completo || '').split(' ')[0]}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{profile?.plano}</p>
                      {isPro && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black rounded-md uppercase tracking-tighter flex items-center gap-0.5">
                          <Crown size={8} />
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                  <img 
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm group-hover:border-primary transition-all"
                    alt="profile"
                  />
                </Link>
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title={t('nav.logout')}
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#1A202C] hover:text-blue-600 p-2"
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
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-black transition-all",
                    location.pathname === item.path 
                      ? "bg-sky-500 text-white" 
                      : "text-[#1A202C] hover:bg-sky-50 hover:text-sky-600"
                  )}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-black text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={20} />
                  {t('nav.logout')}
                </button>
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


function AppContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isPatientArea = user && profile?.tipo_usuario === 'paciente';
  const isPhysioArea = user && profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin';
  const isAdminArea = user && (profile?.tipo_usuario === 'admin' || profile?.plano === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com');
  const isAuthPage = ['/login', '/register', '/reset-password'].includes(location.pathname);
  const isLandingPage = location.pathname === '/' || location.pathname === '/home';
  const isAdminPage = location.pathname === '/admin';

  const showSidebar = user && !isLandingPage && !isAuthPage && location.pathname !== '/preview' && !isAdminPage;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWhatsApp(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-bg-general font-sans text-text-main flex transition-colors duration-300">
      <Toaster position="top-right" richColors closeButton />
      
      <ErrorBoundary>
        <KineAI />
        <NotificationHandler />
        <ScrollToTop />
        
        {showSidebar && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}

        <div className="flex-1 flex flex-col min-w-0">
          {!showSidebar && !isAdminPage ? <Navbar /> : (showSidebar && (
            <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
              <Logo size="sm" />
              <div className="flex items-center gap-4">
                <NotificationBell />
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Menu size={24} />
                </button>
              </div>
            </header>
          ))}

          <main className={cn(
            "flex-1 w-full",
            location.pathname === '/chat' || showSidebar || isAdminPage ? "max-w-none px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12",
            showSidebar && location.pathname !== '/chat' && "p-4 md:p-8 lg:p-12"
          )}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
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
            </Routes>
          </Suspense>
        </main>

        {!showSidebar && location.pathname !== '/chat' && (
          <footer className="bg-white border-t border-border-soft py-20">
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-16">
              <div className="space-y-6">
                <Logo size="lg" />
                <p className="text-base text-text-muted leading-relaxed font-medium">
                  Sua reabilitação no conforto de casa. Transformando a fisioterapia através da tecnologia e do cuidado humanizado para todas as idades.
                </p>
              </div>
              
              <div className="space-y-6">
                <h4 className="text-xl font-black text-text-main uppercase tracking-widest">LINKS RÁPIDOS</h4>
                <ul className="space-y-4 text-base text-text-muted font-medium">
                  <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
                  <li><Link to="/seja-parceiro" className="hover:text-primary transition-colors">Seja um Parceiro</Link></li>
                  <li><Link to="/triagem-ia" className="hover:text-primary transition-colors">Triagem IA</Link></li>
                  <li><Link to="/area-paciente" className="hover:text-primary transition-colors">Área do Paciente</Link></li>
                </ul>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-black text-text-main uppercase tracking-widest">SUPORTE TÉCNICO</h4>
                <p className="text-base text-text-muted font-medium leading-relaxed">
                  Exclusivo para dúvidas sobre o aplicativo e suporte técnico. Para falar com seu fisioterapeuta, utilize a agenda no perfil dele.
                </p>
                <ul className="space-y-4 text-base text-text-muted font-medium">
                  <li className="flex items-center gap-3"><Phone size={20} className="text-primary" /> (11) 98404-0563</li>
                  <li className="flex items-center gap-3"><HelpCircle size={20} className="text-primary" /> suporte@fisiocarehub.com</li>
                  <li className="flex items-center gap-3 text-emerald-600 font-black">
                    <a href="https://wa.me/5511984040563" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline">
                      <MessageCircle size={24} /> Suporte via WhatsApp
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 text-center text-text-muted text-sm mt-20 pt-8 border-t border-border-soft">
              &copy; {new Date().getFullYear()} FisioCareHub. Todos os direitos reservados. <br />
              <span className="text-xs mt-2 block">Cuidado humanizado e tecnologia para sua saúde.</span>
            </div>
          </footer>
        )}
      </div>
    </ErrorBoundary>

      <AnimatePresence>
        {showWhatsApp && location.pathname !== '/chat' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50 }}
            className="fixed bottom-6 right-7 z-[100] group"
          >
            <div className="relative flex items-center">
              {/* Label que aparece apenas no hover */}
              <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg border border-emerald-100 text-emerald-600 font-bold text-xs backdrop-blur-md bg-white/90">
                  Suporte WhatsApp
                </div>
              </div>
              
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://wa.me/5511984040563"
                target="_blank"
                rel="noreferrer"
                className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all relative"
                title="Suporte via WhatsApp"
              >
                <MessageCircle size={28} />
                <div className="absolute -top-1 -right-1 bg-white text-emerald-600 rounded-full p-1 shadow-sm border border-emerald-50">
                  <Video size={12} />
                </div>
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const timeoutId = setTimeout(() => {
        if (!configLoaded) {
          console.warn("Initialization taking too long, forcing configLoaded to true");
          setConfigLoaded(true);
        }
      }, 8000);

      try {
        // 1. Fetch config
        await fetchConfig();
        
        // 2. Init Supabase
        initSupabase();
        
        // 3. Release interface
        clearTimeout(timeoutId);
        setConfigLoaded(true);
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("Erro na inicialização:", err);
        setError(err.message || "Erro ao carregar configurações do sistema.");
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (configLoaded && minTimePassed) {
      setShowSplash(false);
    }
  }, [configLoaded, minTimePassed]);

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
      <AnimatePresence>
        {showSplash && (
          <SplashScreen />
        )}
      </AnimatePresence>

      {configLoaded && (
        <div className={cn(showSplash ? "hidden" : "block")}>
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </div>
      )}
    </>
  );
}
