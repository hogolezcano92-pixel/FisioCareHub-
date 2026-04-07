/**
 * FisioCareHub Frontend
 * Segurança e Conexão (CORS) - Cabeçalhos para AI Studio
 * Access-Control-Allow-Origin: *
 */

import { Routes, Route, Link, useNavigate, useLocation, BrowserRouter } from 'react-router-dom';
import { supabase, initSupabase } from './lib/supabase';
import { fetchConfig } from './config/api';
import { useState, useEffect, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  Activity, 
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
  Video
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

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Triage from './pages/Triage';
import Records from './pages/Records';
import Profile from './pages/Profile';
import Appointments from './pages/Appointments';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import Admin from './pages/Admin';
import AppPreview from './pages/AppPreview';
import About from './pages/About';
import Partner from './pages/Partner';
import ResetPassword from './pages/ResetPassword';
import Subscription from './pages/Subscription';

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
        <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4 transition-colors duration-300">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-sky-100">
            <div className="w-24 h-24 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-3xl font-display font-black text-slate-900 mb-2 tracking-tight">Ops! Algo deu errado</h2>
            <p className="text-xl text-slate-500 mb-8 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-sky-500 text-white rounded-full font-black text-xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-100"
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4 transition-colors duration-300">
      <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Sistema...</p>
    </div>
  );
}

function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { name: t('nav.home'), path: user ? '/dashboard' : '/', icon: HomeIcon },
    ...(user ? [
      ...(profile?.plano === 'admin' || 
          user.email === 'hogolezcano92@gmail.com' ? [{ name: t('nav.admin'), path: '/admin', icon: ShieldCheck }] : []),
      { name: t('nav.appointments'), path: '/appointments', icon: CalendarIcon },
      { name: t('nav.documents'), path: '/documents', icon: FileSignature },
      { name: t('nav.chat'), path: '/chat', icon: MessageSquare },
      { name: t('nav.records'), path: '/records', icon: FileText },
      ...(profile?.plano === 'free' ? [{ name: t('nav.triage'), path: '/triage', icon: BrainCircuit }] : []),
      { name: t('nav.profile'), path: '/profile', icon: User },
    ] : [
      { name: t('nav.login'), path: '/login', icon: User },
      { name: t('nav.register'), path: '/register', icon: Stethoscope },
    ])
  ];

  return (
    <nav className="bg-medical-pattern border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
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
                  "flex items-center gap-2 px-4 py-2 rounded-full text-base font-black transition-all",
                  location.pathname === item.path 
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                    : "text-[#1A202C] hover:bg-sky-50 hover:text-sky-600"
                )}
              >
                <item.icon size={18} />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            ))}
            {user && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
                <Link to="/profile" className="flex items-center gap-3 group">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-black text-slate-900 leading-none">
                      {profile?.plano === 'fisioterapeuta' ? (profile?.genero === 'female' ? 'Dra. ' : 'Dr. ') : ''}
                      {(profile?.nome_completo || '').split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.plano}</p>
                  </div>
                  <img 
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm group-hover:border-sky-500 transition-all"
                    alt="profile"
                  />
                </Link>
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
      .subscribe();

    // Listener Global para Agendamentos (Realtime)
    const appointmentsChannel = supabase
      .channel(`agendamentos_realtime_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agendamentos'
      }, (payload) => {
        if (!isInitialLoad.current) {
          const record = payload.new as any;
          // Filtro de Usuário: paciente ou fisioterapeuta
          if (record && (record.paciente_id === user.id || record.fisio_id === user.id)) {
            playSound();
            if (payload.eventType === 'INSERT') {
              toast.success("Novo Agendamento", {
                description: "Uma nova solicitação de agendamento foi criada."
              });
            } else if (payload.eventType === 'UPDATE') {
              toast.info("Agendamento Atualizado", {
                description: `O status do agendamento foi alterado para: ${record.status}`
              });
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user]);

  return null;
}


function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col transition-colors duration-300">
      <Toaster position="top-right" richColors closeButton />
      
      <ErrorBoundary>
        <KineAI />
        <NotificationHandler />
        <ScrollToTop />
        <Navbar />
        <main className={cn(
          "flex-1 w-full",
          location.pathname === '/chat' ? "max-w-none px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        )}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/triagem-ia" element={<Triage />} />
            <Route path="/records" element={<Records />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/area-paciente" element={<Profile />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/dashboard/assinatura" element={<Subscription />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/preview" element={<AppPreview />} />
            <Route path="/about" element={<About />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/seja-parceiro" element={<Partner />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>

        {location.pathname !== '/chat' && (
          <footer className="bg-white border-t border-slate-200 py-16">
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <Logo size="lg" />
                <p className="text-base text-[#1A202C] leading-relaxed font-medium">
                  Sua reabilitação no conforto de casa. Transformando a fisioterapia através da tecnologia e do cuidado humanizado para todas as idades.
                </p>
              </div>
              
              <div className="space-y-6">
                <h4 className="text-2xl font-black text-[#1A202C] uppercase tracking-widest">LINKS RÁPIDOS</h4>
                <ul className="space-y-5 text-base text-[#1A202C] font-medium">
                  <li><Link to="/sobre" className="hover:text-sky-600 transition-colors">Sobre Nós</Link></li>
                  <li><Link to="/seja-parceiro" className="hover:text-sky-600 transition-colors">Seja um Parceiro</Link></li>
                  <li><Link to="/triagem-ia" className="hover:text-sky-600 transition-colors">Triagem IA</Link></li>
                  <li><Link to="/area-paciente" className="hover:text-sky-600 transition-colors">Área do Paciente</Link></li>
                </ul>
              </div>

              <div className="space-y-6">
                <h4 className="text-2xl font-black text-[#1A202C] uppercase tracking-widest">SUPORTE TÉCNICO</h4>
                <p className="text-base text-[#1A202C] font-medium leading-relaxed">
                  Exclusivo para dúvidas sobre o aplicativo e suporte técnico. Para falar com seu fisioterapeuta, utilize a agenda no perfil dele.
                </p>
                <ul className="space-y-5 text-base text-[#1A202C] font-medium">
                  <li className="flex items-center gap-3"><Phone size={20} className="text-sky-500" /> (11) 98404-0563</li>
                  <li className="flex items-center gap-3"><HelpCircle size={20} className="text-sky-500" /> suporte@fisiocarehub.com</li>
                  <li className="flex items-center gap-3 text-emerald-600 font-black">
                    <a href="https://wa.me/5511984040563" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline">
                      <MessageCircle size={24} /> Suporte via WhatsApp
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 text-center text-[#1A202C] text-sm mt-16 pt-8 border-t border-slate-200">
              &copy; {new Date().getFullYear()} FisioCareHub. Todos os direitos reservados. <br />
              <span className="text-xs mt-2 block">Cuidado humanizado e tecnologia para sua saúde.</span>
            </div>
          </footer>
        )}
      </ErrorBoundary>

      <AnimatePresence>
        {showWhatsApp && !user && location.pathname !== '/chat' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50 }}
            className="fixed bottom-6 right-6 z-[100] group"
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Fetch config
        await fetchConfig();
        
        // 2. Init Supabase
        initSupabase();
        
        // 3. Release interface
        setConfigLoaded(true);
      } catch (err: any) {
        console.error("Erro na inicialização:", err);
        setError(err.message || "Erro ao carregar configurações do sistema.");
      }
    };

    initialize();
  }, []);

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

  if (!configLoaded) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
