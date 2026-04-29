import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  FileText, 
  FileSignature, 
  BrainCircuit, 
  MessageSquare, 
  Bell, 
  User, 
  LogOut,
  X,
  Menu,
  ShieldCheck,
  Activity,
  Crown,
  Users,
  BookOpen,
  Smartphone,
  LayoutDashboard,
  DollarSign,
  Settings,
  Search,
  HelpCircle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin';
  const isAdmin = profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com';
  const isApproved = profile?.status_aprovacao === 'aprovado' || isAdmin || profile?.tipo_usuario === 'paciente';

  const sections = useMemo(() => [
    ...(isAdmin ? [
      {
        title: 'ADMINISTRAÇÃO',
        items: [
          { name: 'Dashboard Admin', path: '/admin', icon: LayoutDashboard },
          { name: 'Gerenciar Usuários', path: '/admin?tab=users', icon: Users },
          { name: 'Biblioteca', path: '/admin?tab=library', icon: BookOpen },
          { name: 'Pagamentos', path: '/admin?tab=payments', icon: DollarSign },
          { name: 'Configurações', path: '/admin?tab=settings', icon: Settings },
          { name: 'Prévia do App', path: '/preview', icon: Smartphone }
        ]
      }
    ] : [
      {
        title: 'ATENDIMENTO',
        items: [
          { name: 'Início', path: isApproved ? '/dashboard' : '/aguardando-aprovacao', icon: Home },
          ...(isPhysio && isApproved ? [
            { name: 'Meus Pacientes', path: '/patients', icon: Users },
            { name: 'Agenda', path: '/agenda', icon: Calendar },
            { name: 'Exercícios', path: '/exercises', icon: Activity },
            { name: 'Triagens', path: '/physio/triages', icon: BrainCircuit },
            { name: 'Prontuários', path: '/records', icon: FileText },
            { name: 'Documentos', path: '/documents', icon: FileSignature },
            { name: 'Assinatura', path: '/subscription', icon: Crown },
          ] : []),
          ...(profile?.tipo_usuario === 'paciente' ? [
            { name: 'Buscar Fisio', path: '/buscar-fisio', icon: Search },
            { name: 'Agenda', path: '/appointments', icon: Calendar },
            { name: 'Exercícios', path: '/patient/exercises', icon: Activity },
            { name: 'Prontuários', path: '/records', icon: FileText },
            { name: 'Documentos', path: '/documents', icon: FileSignature },
            { name: 'Triagem IA', path: '/triage', icon: BrainCircuit },
            { name: 'Biblioteca de Saúde', path: '/patient/library', icon: BookOpen },
          ] : [])
        ]
      },
      ...(isPhysio && isApproved ? [
        {
          title: 'FINANCEIRO',
          items: [
            { name: 'Configuração de Valores', path: '/finance/settings', icon: DollarSign },
          ]
        }
      ] : []),
      ...(isApproved || profile?.tipo_usuario === 'paciente' ? [
        {
          title: 'COMUNICAÇÃO',
          items: [
            { name: 'Chat', path: '/chat', icon: MessageSquare },
            { name: 'Suporte', path: '/chat?support=true', icon: ShieldCheck },
          ]
        }
      ] : [])
    ]),
    {
      title: 'CONTA',
      items: [
        ...(isApproved ? [{ name: 'Minha Conta', path: '/profile', icon: User }] : []),
        { name: 'Sobre nós', path: '/sobre', icon: Info },
        { name: 'Ajuda', path: '#help', icon: HelpCircle },
        { name: 'Sair', path: '#logout', icon: LogOut, variant: 'danger' },
      ]
    }
  ], [isAdmin, isApproved, isPhysio, profile, user]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background border-r border-white/5">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/5">
        <Link to="/dashboard" onClick={() => setIsOpen(false)}>
          <Logo size="sm" variant="light" />
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const isLogout = item.path === '#logout';
                const isHelp = item.path === '#help';

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (isLogout) {
                        handleLogout();
                      } else if (isHelp) {
                        window.dispatchEvent(new CustomEvent('toggle-help-center', { 
                          detail: { profile: profile?.tipo_usuario } 
                        }));
                      } else {
                        navigate(item.path);
                      }
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all group relative sidebar-item",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-premium" 
                        : item.variant === 'danger'
                          ? "text-rose-400 hover:bg-rose-500/10 active:scale-95"
                          : "text-slate-400 hover:bg-white/5 hover:text-white active:scale-95"
                    )}
                  >
                    <item.icon 
                      size={20} 
                      className={cn(
                        "transition-colors",
                        isActive ? "text-white" : item.variant === 'danger' ? "text-rose-400" : "text-slate-500 group-hover:text-primary"
                      )} 
                    />
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Summary */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
          <img 
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`}
            alt="Avatar"
            className="w-10 h-10 rounded-xl object-cover border-2 border-white/10 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">
              {profile?.nome_completo || 'Usuário'}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
              {profile?.tipo_usuario === 'paciente' ? 'Paciente' : (profile?.plano || 'Profissional')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 z-[150] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
