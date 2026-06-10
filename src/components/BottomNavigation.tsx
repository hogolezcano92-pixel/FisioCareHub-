import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  HeartPulse,
  Calendar,
  User,
  Users,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const normalizePath = (path: string) => path.split('?')[0];

const isActivePath = (currentPathname: string, currentSearch: string, itemPath: string) => {
  const [itemPathname, itemSearch = ''] = itemPath.split('?');

  if (normalizePath(currentPathname) !== itemPathname) return false;

  if (!itemSearch) return true;

  const currentParams = new URLSearchParams(currentSearch);
  const itemParams = new URLSearchParams(itemSearch);

  return Array.from(itemParams.entries()).every(([key, value]) => currentParams.get(key) === value);
};

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { user, profile } = useAuth();

  const role = profile?.tipo_usuario;
  const isPatient = role === 'paciente';
  const isPhysio = role === 'fisioterapeuta';

  const items = useMemo(() => {
    if (isPatient) {
      return [
        { name: 'Início', path: '/dashboard', icon: Home },
        { name: 'Buscar', path: '/buscar-fisio', icon: Search },
        { name: 'Jornada', path: '/jornada', icon: HeartPulse },
        { name: 'Agenda', path: '/appointments', icon: Calendar },
        { name: 'Perfil', path: '/profile', icon: User },
      ];
    }

    if (isPhysio) {
      return [
        { name: 'Início', path: '/dashboard', icon: Home },
        { name: 'Pacientes', path: '/patients', icon: Users },
        { name: 'Agenda', path: '/agenda', icon: Calendar },
        { name: 'Chat', path: '/chat', icon: MessageSquare },
        { name: 'Perfil', path: '/profile', icon: User },
      ];
    }

    return [];
  }, [isPatient, isPhysio]);

  if (!user || items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed bottom-0 left-0 right-0 z-[70] md:hidden pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))] px-3"
    >
      <div className="mx-auto max-w-md pointer-events-auto">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/82 dark:bg-slate-950/82 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/12 via-violet-500/10 to-cyan-400/10" />
          <div className="absolute inset-x-8 -top-10 h-20 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative grid grid-cols-5 items-center gap-1 px-2 py-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, location.search, item.path);

              return (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  className={cn(
                    'relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.45rem] px-1 text-[10px] font-black transition-all active:scale-95',
                    active ? 'text-white' : 'text-slate-300 hover:text-white'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-navigation-active-pill"
                      className="absolute inset-0 rounded-[1.45rem] bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-[0_10px_30px_rgba(37,99,235,0.45)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}

                  <span
                    className={cn(
                      'relative flex h-6 w-6 items-center justify-center transition-transform duration-200',
                      active ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.55)]' : 'text-slate-300'
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 3 : 2.5} />
                  </span>
                  <span className={cn('relative leading-none tracking-tight', active ? 'opacity-100' : 'opacity-85')}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
