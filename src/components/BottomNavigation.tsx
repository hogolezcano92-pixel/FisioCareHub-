import React, { useEffect, useMemo, useState } from 'react';
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

const getIsDarkTheme = () => {
  if (typeof document === 'undefined') return false;

  const root = document.documentElement;
  return root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
};

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [isDarkTheme, setIsDarkTheme] = useState(getIsDarkTheme);

  useEffect(() => {
    const updateTheme = () => {
      setIsDarkTheme(getIsDarkTheme());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const role = profile?.tipo_usuario;
  const isPatient = role === 'paciente';
  const isPhysio = role === 'fisioterapeuta';

  const items = useMemo(() => {
    if (isPatient) {
      return [
        { name: 'Início', path: '/dashboard', icon: Home, iconClass: 'text-blue-600' },
        { name: 'Buscar', path: '/buscar-fisio', icon: Search, iconClass: 'text-cyan-600' },
        { name: 'Jornada', path: '/jornada', icon: HeartPulse, iconClass: 'text-violet-600' },
        { name: 'Agenda', path: '/appointments', icon: Calendar, iconClass: 'text-indigo-600' },
        { name: 'Perfil', path: '/profile', icon: User, iconClass: 'text-emerald-600' },
      ];
    }

    if (isPhysio) {
      return [
        { name: 'Início', path: '/dashboard', icon: Home, iconClass: 'text-blue-600' },
        { name: 'Pacientes', path: '/patients', icon: Users, iconClass: 'text-violet-600' },
        { name: 'Agenda', path: '/agenda', icon: Calendar, iconClass: 'text-indigo-600' },
        { name: 'Chat', path: '/chat', icon: MessageSquare, iconClass: 'text-cyan-600' },
        { name: 'Perfil', path: '/profile', icon: User, iconClass: 'text-emerald-600' },
      ];
    }

    return [];
  }, [isPatient, isPhysio]);

  if (!user || items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed left-0 right-0 z-[70] md:hidden pointer-events-none px-5"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-md pointer-events-auto">
        <div
          className={cn(
            'relative overflow-hidden rounded-[1.75rem] border backdrop-blur-2xl',
            isDarkTheme
              ? 'border-white/10 bg-slate-950/90 shadow-[0_24px_70px_rgba(2,6,23,0.70)]'
              : 'border-indigo-100 bg-white shadow-[0_18px_45px_rgba(59,130,246,0.20)]'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              isDarkTheme
                ? 'bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-400/10'
                : 'bg-white'
            )}
          />

          <div
            className={cn(
              'absolute inset-x-8 -top-10 h-20 rounded-full blur-3xl pointer-events-none',
              isDarkTheme ? 'bg-blue-500/20' : 'bg-blue-100/60'
            )}
          />

          <div className="relative grid grid-cols-5 items-center gap-1 px-1 py-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, location.search, item.path);

              return (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  className={cn(
                    'relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-1 text-[10px] font-black transition-all active:scale-95',
                    active
                      ? 'text-white'
                      : isDarkTheme
                        ? 'text-slate-300 hover:text-white'
                        : 'text-slate-800 hover:text-blue-700'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-navigation-active-pill"
                      className="absolute inset-0 rounded-[1.35rem] bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-[0_10px_26px_rgba(37,99,235,0.38)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}

                  <span
                    className={cn(
                      'relative flex h-[22px] w-[22px] items-center justify-center transition-transform duration-200',
                      active
                        ? 'scale-110 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.55)]'
                        : isDarkTheme
                          ? 'text-slate-300'
                          : item.iconClass
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 3 : 2.5} />
                  </span>

                  <span
                    className={cn(
                      'relative leading-none tracking-tight',
                      active
                        ? 'text-white opacity-100'
                        : isDarkTheme
                          ? 'text-slate-300 opacity-90'
                          : 'text-slate-800 opacity-95'
                    )}
                  >
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
