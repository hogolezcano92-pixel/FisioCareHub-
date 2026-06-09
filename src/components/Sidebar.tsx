import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Calendar,
  FileText,
  FileSignature,
  Stethoscope,
  BrainCircuit,
  MessageSquare,
  User,
  LogOut,
  ShieldCheck,
  Activity,
  Crown,
  Users,
  BookOpen,
  Smartphone,
  LayoutDashboard,
  DollarSign,
  Wallet,
  Settings,
  Search,
  HelpCircle,
  Info,
  Lock,
  ShoppingBag,
  HeartPulse
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getEffectivePlan, hasPlanAccess } from '../lib/planAccess';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, subscription, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta' && profile?.tipo_usuario !== 'admin';
  const isAdmin = profile?.tipo_usuario === 'admin' || user?.email?.toLowerCase() === 'hogolezcano92@gmail.com';
  const isApproved = profile?.status_aprovacao === 'aprovado' || isAdmin || profile?.tipo_usuario === 'paciente';
  const currentPlan = getEffectivePlan(profile, subscription);
  const isPro = hasPlanAccess(currentPlan, 'pro');
  const isBasic = hasPlanAccess(currentPlan, 'basic');

  const sections = useMemo(() => [
    ...(isAdmin ? [
      {
        title: t('nav.admin'),
        items: [
          { name: t('nav.admin_dashboard'), path: '/admin', icon: LayoutDashboard },
          { name: t('nav.manage_users'), path: '/admin?tab=users', icon: Users },
          { name: t('nav.library'), path: '/admin?tab=library', icon: BookOpen },
          { name: t('nav.payments'), path: '/admin?tab=payments', icon: DollarSign },
          { name: t('nav.settings'), path: '/admin?tab=settings', icon: Settings },
          { name: t('nav.app_preview'), path: '/preview', icon: Smartphone }
        ]
      }
    ] : [
      {
        title: 'Principal',
        items: [
          { name: t('nav.home'), path: isApproved ? '/dashboard' : '/aguardando-aprovacao', icon: Home },
          ...(isPhysio && isApproved ? [
            { name: t('nav.my_patients'), path: '/patients', icon: Users },
            { name: 'Oportunidades', path: '/opportunities', icon: Search, pro: true },
            { name: 'Minha Agenda', path: '/agenda', icon: Calendar, pro: true },
          ] : []),
          ...(profile?.tipo_usuario === 'paciente' ? [
            { name: 'Jornada', path: '/jornada', icon: HeartPulse },
            { name: t('nav.find_physio'), path: '/buscar-fisio', icon: Search },
            { name: 'Solicitar atendimento', path: '/patient/requests', icon: MessageSquare },
            { name: t('nav.agenda'), path: '/appointments', icon: Calendar },
          ] : [])
        ]
      },
      {
        title: 'Clínica',
        items: [
          ...(isPhysio && isApproved ? [
            { name: t('nav.evaluations'), path: '/physio/evaluations', icon: Stethoscope, pro: true },
            { name: 'Clinical Tests Hub', path: '/clinical-tests', icon: Stethoscope, pro: true },
            { name: t('nav.exercises'), path: '/exercises', icon: Activity, pro: true },
            { name: t('nav.triages'), path: '/physio/triages', icon: BrainCircuit, pro: true },
            { name: 'Exames IA', path: '/exames-ia', icon: BrainCircuit },
            { name: t('nav.records'), path: '/records', icon: FileText },
            { name: t('nav.documents'), path: '/documents', icon: FileSignature },
          ] : []),
          ...(profile?.tipo_usuario === 'paciente' ? [
            { name: t('nav.pain_diary'), path: '/diario', icon: Activity },
            { name: t('nav.workouts'), path: '/treinos', icon: Activity },
            { name: t('nav.records'), path: '/records', icon: FileText },
            { name: t('nav.documents'), path: '/documents', icon: FileSignature },
            { name: t('nav.triage'), path: '/triage', icon: BrainCircuit },
            { name: 'Exames IA', path: '/exames-ia', icon: BrainCircuit },
            { name: t('nav.library'), path: '/patient/library', icon: BookOpen },
          ] : [])
        ]
      },
      {
        title: 'Negócios',
        items: [
          ...(isPhysio && isApproved ? [
            { name: 'FisioStore', path: '/loja', icon: ShoppingBag },
            { name: 'Financeiro', path: '/profile?tab=earnings', icon: Wallet, pro: true },
            { name: t('nav.finance_settings'), path: '/finance/settings', icon: DollarSign, pro: true },
            { name: t('nav.subscription'), path: '/subscription', icon: Crown },
          ] : []),
          ...(profile?.tipo_usuario === 'paciente' ? [
            { name: 'FisioStore', path: '/loja', icon: ShoppingBag },
          ] : [])
        ]
      },
      ...(isApproved || profile?.tipo_usuario === 'paciente' ? [
        {
          title: t('nav.communication'),
          items: [
            { name: t('nav.chat'), path: '/chat', icon: MessageSquare },
            { name: t('nav.support'), path: '/chat?support=true', icon: ShieldCheck },
          ]
        }
      ] : [])
    ]),
    {
      title: t('nav.account'),
      items: [
        ...(isApproved ? [{ name: t('nav.profile'), path: '/profile', icon: User }] : []),
        { name: profile?.tipo_usuario === 'paciente' ? t('nav.patient_guide') : t('nav.guide'), path: '/guia', icon: BookOpen },
        { name: t('nav.about'), path: '/sobre', icon: Info },
        { name: t('nav.help'), path: '#help', icon: HelpCircle },
        { name: t('nav.logout'), path: '#logout', icon: LogOut, variant: 'danger' },
      ]
    }
  ].filter((section) => section.items.length > 0), [isAdmin, isApproved, isPhysio, isPro, isBasic, profile, user, t]);


  const isItemActive = (path: string) => {
    if (!path || path.startsWith('#')) return false;

    const [itemPathname, itemSearch = ''] = path.split('?');

    if (location.pathname !== itemPathname) return false;

    // Quando o item tem query string, compara também os parâmetros.
    // Isso deixa ativo links como /profile?tab=earnings e /admin?tab=users.
    if (itemSearch) {
      const itemParams = new URLSearchParams(itemSearch);
      return Array.from(itemParams.entries()).every(
        ([key, value]) => location.search ? new URLSearchParams(location.search).get(key) === value : false
      );
    }

    // Para rotas sem query, só marca ativo quando a página atual também não tem query.
    // Assim "Minha conta" não fica ativo junto com "Financeiro".
    return !location.search;
  };

  const getSidebarIconColor = (item: any) => {
    const key = `${item.path || ''} ${item.name || ''}`.toLowerCase();

    if (item.variant === 'danger') return '#E11D48';
    if (key.includes('agenda') || key.includes('calendar') || key.includes('appointments')) return '#2563EB';
    if (key.includes('paciente') || key.includes('patients') || key.includes('jornada')) return '#7C3AED';
    if (key.includes('oportunidade') || key.includes('buscar') || key.includes('search')) return '#0891B2';
    if (key.includes('avalia') || key.includes('evaluation')) return '#059669';
    if (key.includes('exerc') || key.includes('treino') || key.includes('workout')) return '#16A34A';
    if (key.includes('loja') || key.includes('fisiostore')) return '#9333EA';
    if (key.includes('triage') || key.includes('triagem') || key.includes('exames')) return '#0EA5E9';
    if (key.includes('prontu') || key.includes('record')) return '#EA580C';
    if (key.includes('document')) return '#DB2777';
    if (key.includes('assinatura') || key.includes('subscription')) return '#CA8A04';
    if (key.includes('financeiro') || key.includes('earnings') || key.includes('saque')) return '#D97706';
    if (key.includes('chat') || key.includes('suporte') || key.includes('support')) return '#2563EB';
    if (key.includes('perfil') || key.includes('profile')) return '#4F46E5';
    if (key.includes('guia') || key.includes('library') || key.includes('biblioteca')) return '#0D9488';
    if (key.includes('sobre') || key.includes('about') || key.includes('ajuda') || key.includes('help')) return '#64748B';
    if (key.includes('finance') || key.includes('payment') || key.includes('pagamento')) return '#D97706';
    if (key.includes('admin') || key.includes('settings')) return '#7C3AED';

    return '#475569';
  };

  const sidebarContent = (
    <>
      <style>{`
        /* Light mode: igual ao dark mode, sem cards nas abas */
        html:not(.dark) .fisio-sidebar-shell,
        body.light .fisio-sidebar-shell,
        html.light .fisio-sidebar-shell,
        :root[data-theme="light"] .fisio-sidebar-shell {
          background:
            radial-gradient(circle at 18% 0%, rgba(124, 58, 237, 0.16), transparent 34%),
            radial-gradient(circle at 88% 22%, rgba(59, 130, 246, 0.08), transparent 28%),
            linear-gradient(180deg, #EFE8FF 0%, #F5F0FF 46%, #F0E9FF 100%) !important;
          border-right: none !important;
        }

        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-logo-area,
        body.light .fisio-sidebar-shell .fisio-sidebar-logo-area,
        html.light .fisio-sidebar-shell .fisio-sidebar-logo-area,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-logo-area {
          background: rgba(255, 255, 255, 0.14) !important;
          border-bottom: 1px solid rgba(167, 139, 250, 0.24) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-logo-area img,
        body.light .fisio-sidebar-shell .fisio-sidebar-logo-area img,
        html.light .fisio-sidebar-shell .fisio-sidebar-logo-area img,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-logo-area img {
          filter: drop-shadow(0 8px 18px rgba(37, 99, 235, 0.16)) contrast(1.05) saturate(1.06) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-section-title,
        body.light .fisio-sidebar-shell .sidebar-section-title,
        html.light .fisio-sidebar-shell .sidebar-section-title,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-section-title {
          color: #475569 !important;
          opacity: 1 !important;
        }

        /* Sem card nas abas */
        html:not(.dark) .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item),
        body.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item),
        html.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item),
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) {
          background: transparent !important;
          color: #475569 !important;
          border: none !important;
          box-shadow: none !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover,
        body.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover,
        html.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover {
          background: rgba(255, 255, 255, 0.26) !important;
          color: #4338CA !important;
          border: none !important;
          box-shadow: none !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg,
        body.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg,
        html.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg {
          color: var(--sidebar-icon-color, #475569) !important;
          stroke: var(--sidebar-icon-color, #475569) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover svg,
        body.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover svg,
        html.light .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover svg,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover svg {
          color: var(--sidebar-icon-color, #4338CA) !important;
          stroke: var(--sidebar-icon-color, #4338CA) !important;
          filter: none !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-active-item,
        body.light .fisio-sidebar-shell .sidebar-active-item,
        html.light .fisio-sidebar-shell .sidebar-active-item,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-active-item {
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%) !important;
          color: #FFFFFF !important;
          border: none !important;
          box-shadow: 0 16px 34px -22px rgba(91, 33, 182, 0.58) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-active-item *,
        body.light .fisio-sidebar-shell .sidebar-active-item *,
        html.light .fisio-sidebar-shell .sidebar-active-item *,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-active-item * {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
          opacity: 1 !important;
        }

        html:not(.dark) .fisio-sidebar-shell .sidebar-active-item svg,
        body.light .fisio-sidebar-shell .sidebar-active-item svg,
        html.light .fisio-sidebar-shell .sidebar-active-item svg,
        :root[data-theme="light"] .fisio-sidebar-shell .sidebar-active-item svg {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
        }

        /* Mantém o card do perfil como no dark mode */
        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-profile-area,
        body.light .fisio-sidebar-shell .fisio-sidebar-profile-area,
        html.light .fisio-sidebar-shell .fisio-sidebar-profile-area,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-profile-area {
          background: transparent !important;
          border-top: 1px solid rgba(167, 139, 250, 0.24) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-profile-card,
        body.light .fisio-sidebar-shell .fisio-sidebar-profile-card,
        html.light .fisio-sidebar-shell .fisio-sidebar-profile-card,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-profile-card {
          background: rgba(255, 255, 255, 0.5) !important;
          border: 1px solid rgba(255, 255, 255, 0.35) !important;
          box-shadow: 0 14px 30px -26px rgba(88, 28, 135, 0.4) !important;
          backdrop-filter: blur(10px) !important;
        }

        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-profile-card p:first-of-type,
        body.light .fisio-sidebar-shell .fisio-sidebar-profile-card p:first-of-type,
        html.light .fisio-sidebar-shell .fisio-sidebar-profile-card p:first-of-type,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-profile-card p:first-of-type {
          color: #0F172A !important;
          opacity: 1 !important;
        }

        html:not(.dark) .fisio-sidebar-shell .fisio-sidebar-profile-card p:last-of-type,
        body.light .fisio-sidebar-shell .fisio-sidebar-profile-card p:last-of-type,
        html.light .fisio-sidebar-shell .fisio-sidebar-profile-card p:last-of-type,
        :root[data-theme="light"] .fisio-sidebar-shell .fisio-sidebar-profile-card p:last-of-type {
          color: #334155 !important;
          opacity: 1 !important;
        }

        /* Esconde scrollbar para ficar igual ao dark */
        .fisio-sidebar-shell nav::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }

        .fisio-sidebar-shell nav {
          scrollbar-width: none;
        }
      `}</style>

      <div className="fisio-sidebar-shell flex flex-col h-full bg-background border-r border-white/5">
        {/* Logo Section */}
        <div className="fisio-sidebar-logo-area p-6 border-b border-white/5">
          <Link to="/dashboard" onClick={() => setIsOpen(false)}>
            <Logo size="sm" variant="light" />
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-5 custom-scrollbar">
          {sections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={cn(
                "space-y-2",
                sectionIndex > 0 && "border-t border-white/10 pt-5 dark:border-white/10"
              )}
            >
              <h3 className="sidebar-section-title px-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500/90 dark:text-slate-500">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item: any) => {
                  const isActive = isItemActive(item.path);
                  const isLogout = item.path === '#logout';
                  const isHelp = item.path === '#help';
                  const isLocked = (item.pro && !isPro) || (item.basic && !isBasic);

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
                        } else if (isLocked) {
                          navigate('/subscription');
                        } else {
                          navigate(item.path);
                        }
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all group relative sidebar-item active:scale-95",
                        isActive
                          ? "sidebar-active-item bg-gradient-to-r from-violet-700 to-blue-600 text-white shadow-lg shadow-violet-300/50 dark:shadow-premium"
                          : item.variant === 'danger'
                            ? "text-rose-400 hover:bg-rose-500/10"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          size={20}
                          style={
                            !isActive
                              ? ({ '--sidebar-icon-color': getSidebarIconColor(item) } as React.CSSProperties)
                              : undefined
                          }
                          className={cn(
                            "transition-colors",
                            isActive
                              ? "text-white"
                              : item.variant === 'danger'
                                ? "text-rose-400"
                                : "text-slate-600 dark:text-slate-500 group-hover:text-violet-700 dark:group-hover:text-primary"
                          )}
                        />
                        <span>{item.name}</span>
                      </div>

                      {isLocked && (
                        <Lock size={12} className="text-amber-500 group-hover:text-amber-400 transition-colors" />
                      )}

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
        <div className="fisio-sidebar-profile-area p-4 border-t border-white/5">
          <div className="fisio-sidebar-profile-card flex items-center gap-3 p-3 rounded-2xl bg-white/5">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`}
              alt="Avatar"
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">
                {profile?.nome_completo || 'Usuário'}
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {profile?.tipo_usuario === 'paciente'
                  ? (profile?.idioma === 'en' ? 'Patient' : profile?.idioma === 'es' ? 'Paciente' : 'Paciente')
                  : (profile?.plano === 'admin'
                    ? 'Admin'
                    : (profile?.idioma === 'en' ? 'Professional' : profile?.idioma === 'es' ? 'Profesional' : 'Profissional'))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
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
