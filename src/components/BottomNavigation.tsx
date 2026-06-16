import React, { useEffect, useMemo, useRef, useState } from 'react';
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


const getElementClassName = (element: Element) => {
  const rawClassName = (element as HTMLElement).className;
  if (typeof rawClassName === 'string') return rawClassName;
  if (rawClassName && typeof rawClassName === 'object' && 'baseVal' in rawClassName) {
    return String((rawClassName as SVGAnimatedString).baseVal || '');
  }
  return '';
};

const hasVisibleModalOrOverlay = () => {
  if (typeof document === 'undefined') return false;

  const candidates = Array.from(
    document.body.querySelectorAll<HTMLElement>('[aria-modal="true"], [role="dialog"], dialog[open], .fixed')
  );

  return candidates.some((element) => {
    if (element.closest('[data-bottom-navigation="true"]')) return false;

    const styles = window.getComputedStyle(element);
    if (styles.display === 'none' || styles.visibility === 'hidden' || Number(styles.opacity) === 0) return false;

    if (element.getAttribute('aria-modal') === 'true' || element.getAttribute('role') === 'dialog') return true;
    if (element.tagName.toLowerCase() === 'dialog' && (element as HTMLDialogElement).open) return true;

    const className = getElementClassName(element);
    const isFullScreenOverlay = className.includes('fixed') && className.includes('inset-0');
    if (!isFullScreenOverlay) return false;

    const zIndex = Number.parseInt(styles.zIndex || '0', 10);
    return Number.isFinite(zIndex) && zIndex >= 50;
  });
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
  const [autoHidden, setAutoHidden] = useState(false);
  const [manualHidden, setManualHidden] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const hideRequestsRef = useRef<Record<string, boolean>>({});
  const lastScrollYRef = useRef(0);

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


  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let frame = 0;
    const updateAutoHidden = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setAutoHidden(hasVisibleModalOrOverlay());
      });
    };

    const handleVisibilityRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string; hidden?: boolean }>;
      const source = customEvent.detail?.source || 'global';
      const hidden = Boolean(customEvent.detail?.hidden);

      if (hidden) {
        hideRequestsRef.current[source] = true;
      } else {
        delete hideRequestsRef.current[source];
      }

      setManualHidden(Object.values(hideRequestsRef.current).some(Boolean));
    };

    updateAutoHidden();

    const observer = new MutationObserver(updateAutoHidden);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-modal', 'role'],
    });

    window.addEventListener('fch:bottom-navigation-visibility', handleVisibilityRequest as EventListener);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('fch:bottom-navigation-visibility', handleVisibilityRequest as EventListener);
    };
  }, []);


  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;

    const updateCompactState = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(window.scrollY, 0);
        const isScrollingDown = currentScrollY > lastScrollYRef.current + 4;
        const isScrollingUp = currentScrollY < lastScrollYRef.current - 4;

        if (currentScrollY <= 28) {
          setIsCompact(false);
        } else if (isScrollingDown && currentScrollY > 80) {
          setIsCompact(true);
        } else if (isScrollingUp) {
          setIsCompact(false);
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    lastScrollYRef.current = Math.max(window.scrollY, 0);
    updateCompactState();

    window.addEventListener('scroll', updateCompactState, { passive: true });
    window.addEventListener('resize', updateCompactState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateCompactState);
      window.removeEventListener('resize', updateCompactState);
    };
  }, [location.pathname]);

  const role = profile?.tipo_usuario;
  const isPatient = role === 'paciente';
  const isPhysio = role === 'fisioterapeuta';

  const items = useMemo(() => {
    if (isPatient) {
      return [
        { name: 'Início', path: '/dashboard', icon: Home, iconClass: 'text-blue-600' },
        { name: 'Descubra', path: '/descubra', icon: Search, iconClass: 'text-cyan-600' },
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

  const shouldHideBottomNavigation = autoHidden || manualHidden;

  return (
    <nav
      aria-label="Navegação principal mobile"
      data-bottom-navigation="true"
      className={cn(
        'fixed left-0 right-0 z-[70] md:hidden pointer-events-none px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        shouldHideBottomNavigation
          ? 'translate-y-[125%] opacity-0 blur-sm'
          : 'translate-y-0 opacity-100 blur-0'
      )}
      style={{ bottom: 'max(0.35rem, calc(env(safe-area-inset-bottom) - 0.15rem))' }}
    >
      <div
        className={cn(
          'mx-auto pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          isCompact ? 'max-w-[300px] scale-[0.96]' : 'max-w-[370px] scale-100'
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-full border backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            isCompact ? 'shadow-[0_10px_28px_rgba(15,23,42,0.20)]' : 'shadow-[0_18px_52px_rgba(15,23,42,0.24)]',
            isDarkTheme
              ? 'border-white/10 bg-slate-950/90 shadow-black/50'
              : 'border-white/80 bg-white/95 shadow-blue-500/20'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              isDarkTheme
                ? 'bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-400/10'
                : 'bg-gradient-to-r from-white via-blue-50/70 to-white'
            )}
          />

          <div
            className={cn(
              'absolute inset-x-8 -top-10 h-20 rounded-full blur-3xl pointer-events-none',
              isDarkTheme ? 'bg-blue-500/20' : 'bg-blue-100/60'
            )}
          />

          <div
            className={cn(
              'relative grid grid-cols-5 items-center gap-0.5 px-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isCompact ? 'py-0.5' : 'py-1'
            )}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, location.search, item.path);

              return (
                <Link
                  key={`${item.name}-${item.path}`}
                  to={item.path}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-full px-1 font-black transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95',
                    isCompact ? 'min-h-[40px] gap-0 text-[0px]' : 'min-h-[50px] gap-0.5 text-[9px]',
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
                      className={cn(
                        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-[0_10px_26px_rgba(37,99,235,0.38)] transition-all duration-300',
                        isCompact ? 'h-8 w-8' : 'h-[40px] w-[40px]'
                      )}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}

                  <span
                    className={cn(
                      'relative flex items-center justify-center transition-all duration-300',
                      isCompact ? 'h-[18px] w-[18px]' : 'h-5 w-5',
                      active
                        ? 'scale-110 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.55)]'
                        : isDarkTheme
                          ? 'text-slate-300'
                          : item.iconClass
                    )}
                  >
                    <Icon size={isCompact ? 18 : 20} strokeWidth={active ? 3 : 2.5} />
                  </span>

                  <span
                    className={cn(
                      'relative overflow-hidden leading-none tracking-tight transition-all duration-300',
                      active
                        ? 'text-white opacity-100'
                        : isDarkTheme
                          ? 'text-slate-300 opacity-90'
                          : 'text-slate-800 opacity-95',
                      isCompact && 'max-h-0 translate-y-1 opacity-0',
                      !isCompact && 'max-h-4 translate-y-0'
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
