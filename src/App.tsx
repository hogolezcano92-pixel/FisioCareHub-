import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
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
  Bell
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-red-100">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-500 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
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

function Navbar() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
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
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"
              >
                <Activity size={24} />
              </motion.div>
              <span className="text-xl font-display font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                FisioCareHub
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {navItems.map((item) => (
              <Link
                key={`${item.name}-${item.path}`}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.path 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden lg:inline">Sair</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-blue-600 p-2"
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
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                    location.pathname === item.path 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-slate-600 hover:bg-slate-50"
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
    
    // Reset initial load flag after a short delay
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

    // Listen for new notifications specifically
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
        
        // Only notify if it's very recent (within 10 seconds)
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


export default function App() {
  const [user, loading] = useAuthState(auth);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWhatsApp(true);
    }, 3000); // 3 seconds delay
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
      <Toaster position="top-right" richColors closeButton />
      <NotificationHandler />
      <Navbar />
      <main className={cn(
        "flex-1 w-full",
        location.pathname === '/chat' ? "max-w-none px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      )}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/records" element={<Records />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/dashboard/assinatura" element={<Subscription />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* WhatsApp Floating Button */}
      <AnimatePresence>
        {showWhatsApp && (
          <motion.a
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            href="https://wa.me/5511984040563"
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all z-[100]"
            title="Suporte via WhatsApp"
          >
            <MessageCircle size={28} />
          </motion.a>
        )}
      </AnimatePresence>

      {location.pathname !== '/chat' && (
        <footer className="bg-slate-50/50 border-t border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Activity size={20} />
                </div>
                <span className="text-lg font-bold">FisioCareHub</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Transformando a fisioterapia através da tecnologia e do cuidado humanizado. 
                Sua saúde em boas mãos, em qualquer lugar.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900">Links Rápidos</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/" className="hover:text-blue-600">Sobre Nós</Link></li>
                <li><Link to="/register" className="hover:text-blue-600">Seja um Parceiro</Link></li>
                <li><Link to="/triage" className="hover:text-blue-600">Triagem IA</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900">Suporte</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2"><Phone size={16} /> (11) 98404-0563</li>
                <li className="flex items-center gap-2"><HelpCircle size={16} /> suporte@fisiocarehub.com</li>
                <li className="flex items-center gap-2 text-emerald-600 font-bold">
                  <a href="https://wa.me/5511984040563" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                    <MessageCircle size={16} /> Atendimento via WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs mt-12 pt-8 border-t border-slate-50">
            &copy; {new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.
          </div>
        </footer>
      )}
    </div>
  );
}
