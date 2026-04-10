import React from 'react';
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
  Users
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
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';
  const isAdmin = profile?.plano === 'admin' || profile?.tipo_usuario === 'admin';

  const sections = [
    {
      title: 'ATENDIMENTO',
      items: [
        { name: 'Início', path: '/dashboard', icon: Home },
        ...(isPhysio ? [
          { name: 'Meus Pacientes', path: '/patients', icon: Users },
          { name: 'Agenda', path: '/agenda', icon: Calendar },
          { name: 'Exercícios', path: '/exercises', icon: Activity },
          { name: 'Triagens', path: '/physio/triages', icon: BrainCircuit },
          { name: 'Prontuários', path: '/records', icon: FileText },
          { name: 'Documentos', path: '/documents', icon: FileSignature },
          { name: 'Assinatura', path: '/subscription', icon: Crown },
        ] : [
          { name: 'Agenda', path: '/appointments', icon: Calendar },
          { name: 'Exercícios', path: '/patient/exercises', icon: Activity },
          { name: 'Prontuários', path: '/records', icon: FileText },
          { name: 'Documentos', path: '/documents', icon: FileSignature },
          { name: 'Triagem IA', path: '/triage', icon: BrainCircuit },
        ])
      ]
    },
    {
      title: 'COMUNICAÇÃO',
      items: [
        { name: 'Chat', path: '/chat', icon: MessageSquare },
        { name: 'Notificações', path: '/profile', icon: Bell },
      ]
    },
    {
      title: 'CONTA',
      items: [
        { name: 'Perfil', path: '/profile', icon: User },
        ...(isAdmin ? [{ name: 'Painel Admin', path: '/admin', icon: ShieldCheck }] : []),
        { name: 'Sair', path: '#logout', icon: LogOut, variant: 'danger' },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1120] border-r border-white/5">
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

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (isLogout) {
                        handleLogout();
                      } else {
                        navigate(item.path);
                      }
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all group relative",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                        : item.variant === 'danger'
                          ? "text-rose-400 hover:bg-rose-500/10 active:scale-95"
                          : "text-slate-400 hover:bg-white/5 hover:text-white active:scale-95"
                    )}
                  >
                    <item.icon 
                      size={20} 
                      className={cn(
                        "transition-colors",
                        isActive ? "text-white" : item.variant === 'danger' ? "text-rose-400" : "text-slate-500 group-hover:text-blue-400"
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
              {profile?.plano || 'Paciente'}
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 z-[70] lg:hidden"
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
