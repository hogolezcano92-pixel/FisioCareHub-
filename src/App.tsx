/**
 * FisioCareHub Frontend
 * Segurança e Conexão (CORS) - Cabeçalhos para AI Studio
 * Access-Control-Allow-Origin: *
 */

import { Routes, Route, Link, useNavigate, useLocation, BrowserRouter } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleFirestoreError, OperationType, initFirebase } from './lib/firebase';
import { initSupabase } from './lib/supabase';
import { fetchConfig } from './config/api';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { useState, useEffect, Component, ErrorInfo, ReactNode, useRef } from 'react';
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
  Video,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';

// Components
import NotificationBell from './components/NotificationBell';

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
import Subscription from './pages/Subscription';
import Documents from './pages/Documents';
import Admin from './pages/Admin';
import About from './pages/About';
import Partner from './pages/Partner';

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
        <div className="min-h-screen bg-sky-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-sky-100 dark:border-slate-800">
            <div className="w-24 h-24 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={48} />
            </div>
            <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-2 tracking-tight">Ops! Algo deu errado</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-sky-500 text-white rounded-full font-black text-xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 dark:shadow-sky-900/20"
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
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center space-y-4 transition-colors duration-300">
      <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Sistema...</p>
    </div>
  );
}

function Navbar() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  useEffect(() => {
    if (user && db) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserData(snap.data());
      });
    } else {
      setUserData(null);
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { name: 'Início', path: user ? '/dashboard' : '/', icon: HomeIcon },
    ...(user ? [
      ...(userData?.role === 'admin' || user.email === 'hugo_lezcano92@hotmail.com' || user.email === 'hogolezcano92@gmail.com' ? [{ name: 'Painel Admin', path: '/admin', icon: ShieldCheck }] : []),
      { name: 'Agenda', path: '/appointments', icon: CalendarIcon },
      { name: 'Documentos', path: '/documents', icon: FileSignature },
      { name: 'Chat', path: '/chat', icon: MessageSquare },
      { name: 'Prontuários', path: '/records', icon: FileText },
      { name: 'Triagem IA', path: '/triage', icon: BrainCircuit },
      { name: 'Perfil', path: '/profile', icon: User },
    ] : [
      { name: 'Entrar', path: '/login', icon: User },
      { name: 'Cadastrar', path: '/register', icon: Stethoscope },
    ])
  ];

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20"
              >
                <Activity size={28} />
              </motion.div>
              <span className="text-3xl font-display font-black bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent tracking-tighter">
                FisioCareHub
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors mr-2"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {navItems.map((item) => (
              <Link
                key={`${item.name}-${item.path}`}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-base font-black transition-all",
                  location.pathname === item.path 
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                    : "text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-900 hover:text-sky-600 dark:hover:text-sky-400"
                )}
              >
                <item.icon size={18} />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            ))}
            {user && (
              <>
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-base font-black text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={18} />
                  <span className="hidden lg:inline">Sair</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 p-2"
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
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                    location.pathname === item.path 
                      ? "bg-blue-50 dark:bg-sky-900 text-blue-600 dark:text-sky-400" 
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={20} />
                  Sair
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
  const [user] = useAuthState(auth);
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
    if (!user || !db) return;

    const qNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(qNotifications, (snap) => {
      if (!isInitialLoad.current && !snap.empty) {
        const docData = snap.docs[0].data();
        const createdAt = docData.createdAt?.toDate ? docData.createdAt.toDate().getTime() : Date.now();
        
        if (Date.now() - createdAt < 10000) {
          playSound();
          toast.info(docData.title, {
            description: docData.message,
            action: docData.link ? {
              label: "Ver",
              onClick: () => window.location.href = docData.link
            } : undefined
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  return null;
}


function AppContent() {
  const [user, loading] = useAuthState(auth);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWhatsApp(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <Toaster position="top-right" richColors closeButton />
      
      <NotificationHandler />
      <ScrollToTop />
      <Navbar />
      <main className={cn(
        "flex-1 w-full",
        location.pathname === '/chat' ? "max-w-none px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      )}>
        <ErrorBoundary>
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
            <Route path="/about" element={<About />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/seja-parceiro" element={<Partner />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <AnimatePresence>
        {showWhatsApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50 }}
            className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3"
          >
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white px-4 py-2 rounded-2xl shadow-xl border border-emerald-100 text-emerald-600 font-bold text-sm backdrop-blur-md bg-white/90"
            >
              Suporte FisioCareHub
            </motion.div>
            <motion.a
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              href="https://wa.me/5511984040563"
              target="_blank"
              rel="noreferrer"
              className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:bg-emerald-600 transition-all animate-pulse-custom relative group"
              title="Suporte via WhatsApp"
            >
              <div className="relative">
                <MessageCircle size={36} />
                <div className="absolute -top-2 -right-2 bg-white text-emerald-600 rounded-full p-1 shadow-md">
                  <Video size={16} />
                </div>
              </div>
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      {location.pathname !== '/chat' && (
        <footer className="bg-sky-50/50 border-t border-sky-100 py-16">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <Activity size={28} />
                </div>
                <span className="text-3xl font-display font-black text-slate-900">FisioCareHub</span>
              </div>
              <p className="text-base text-slate-500 leading-relaxed font-medium">
                Sua reabilitação no conforto de casa. Transformando a fisioterapia através da tecnologia e do cuidado humanizado para todas as idades.
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Links Rápidos</h4>
              <ul className="space-y-3 text-base text-slate-500 font-medium">
                <li><Link to="/sobre" className="hover:text-sky-600 transition-colors">Sobre Nós</Link></li>
                <li><Link to="/seja-parceiro" className="hover:text-sky-600 transition-colors">Seja um Parceiro</Link></li>
                <li><Link to="/triagem-ia" className="hover:text-sky-600 transition-colors">Triagem IA</Link></li>
                <li><Link to="/area-paciente" className="hover:text-sky-600 transition-colors">Área do Paciente</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Suporte Técnico</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                Exclusivo para dúvidas sobre o aplicativo e suporte técnico. Para falar com seu fisioterapeuta, utilize a agenda no perfil dele.
              </p>
              <ul className="space-y-3 text-base text-slate-500 font-medium">
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
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm mt-16 pt-8 border-t border-sky-100">
            &copy; {new Date().getFullYear()} FisioCareHub. Todos os direitos reservados. <br />
            <span className="text-xs mt-2 block">Cuidado humanizado e tecnologia para sua saúde.</span>
          </div>
        </footer>
      )}
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
        
        // 2. Init Firebase
        initFirebase();
        
        // 3. Init Supabase
        initSupabase();
        
        // 4. Release interface
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
      <div className="min-h-screen bg-sky-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-sky-100 dark:border-slate-800">
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
      <AppContent />
    </BrowserRouter>
  );
}
