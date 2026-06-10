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
    if (key.includes('agenda') || key.includes('calendar') || key.includes('appointments')) return '#34D399';
    if (key.includes('jornada')) return '#A78BFA';
    if (key.includes('paciente') || key.includes('patients')) return '#60A5FA';
    if (key.includes('oportunidade') || key.includes('buscar') || key.includes('search')) return '#22D3EE';
    if (key.includes('avalia') || key.includes('evaluation')) return '#059669';
    if (key.includes('exerc') || key.includes('treino') || key.includes('workout')) return '#A3E635';
    if (key.includes('loja') || key.includes('fisiostore')) return '#38BDF8';
    if (key.includes('triage') || key.includes('triagem') || key.includes('exames')) return '#C084FC';
    if (key.includes('prontu') || key.includes('record')) return '#818CF8';
    if (key.includes('document')) return '#38BDF8';
    if (key.includes('assinatura') || key.includes('subscription')) return '#CA8A04';
    if (key.includes('financeiro') || key.includes('earnings') || key.includes('saque')) return '#D97706';
    if (key.includes('chat') || key.includes('suporte') || key.includes('support')) return '#60A5FA';
    if (key.includes('perfil') || key.includes('profile')) return '#4F46E5';
    if (key.includes('guia') || key.includes('library') || key.includes('biblioteca')) return '#0D9488';
    if (key.includes('sobre') || key.includes('about') || key.includes('ajuda') || key.includes('help')) return '#64748B';
    if (key.includes('finance') || key.includes('payment') || key.includes('pagamento')) return '#D97706';
    if (key.includes('admin') || key.includes('settings')) return '#7C3AED';

    return '#7DD3FC';
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

        /* Dark mode: sidebar mais premium, com textos nítidos e ícones coloridos */
        html.dark .fisio-sidebar-shell,
        body.dark .fisio-sidebar-shell,
        :root[data-theme="dark"] .fisio-sidebar-shell {
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.10), transparent 32%),
            radial-gradient(circle at 88% 18%, rgba(59, 130, 246, 0.08), transparent 28%),
            linear-gradient(180deg, #090D1A 0%, #0A1021 48%, #080D1A 100%) !important;
          border-right: 1px solid rgba(148, 163, 184, 0.10) !important;
        }

        html.dark .fisio-sidebar-shell .fisio-sidebar-logo-area,
        body.dark .fisio-sidebar-shell .fisio-sidebar-logo-area,
        :root[data-theme="dark"] .fisio-sidebar-shell .fisio-sidebar-logo-area {
          background: rgba(8, 13, 26, 0.35) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.10) !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-section-title,
        body.dark .fisio-sidebar-shell .sidebar-section-title,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-section-title {
          color: #AAB7D8 !important;
          opacity: 1 !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item),
        body.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item),
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) {
          background: transparent !important;
          color: #EAF0FF !important;
          border: 1px solid transparent !important;
          box-shadow: none !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) span,
        body.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) span,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) span {
          color: #EAF0FF !important;
          opacity: 0.88 !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg,
        body.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item) svg {
          color: var(--sidebar-icon-color, #7DD3FC) !important;
          stroke: var(--sidebar-icon-color, #7DD3FC) !important;
          opacity: 0.96 !important;
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--sidebar-icon-color, #7DD3FC) 34%, transparent));
        }

        html.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover,
        body.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover {
          background: rgba(255, 255, 255, 0.055) !important;
          color: #FFFFFF !important;
          border-color: rgba(148, 163, 184, 0.11) !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover span,
        body.dark .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover span,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-item:not(.sidebar-active-item):hover span {
          color: #FFFFFF !important;
          opacity: 1 !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-active-item,
        body.dark .fisio-sidebar-shell .sidebar-active-item,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-active-item {
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%) !important;
          color: #FFFFFF !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 18px 42px -22px rgba(59, 130, 246, 0.72) !important;
        }

        html.dark .fisio-sidebar-shell .sidebar-active-item *,
        body.dark .fisio-sidebar-shell .sidebar-active-item *,
        :root[data-theme="dark"] .fisio-sidebar-shell .sidebar-active-item * {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
          opacity: 1 !important;
        }

        html.dark .fisio-sidebar-shell .fisio-sidebar-profile-area,
        body.dark .fisio-sidebar-shell .fisio-sidebar-profile-area,
        :root[data-theme="dark"] .fisio-sidebar-shell .fisio-sidebar-profile-area {
          border-top: 1px solid rgba(148, 163, 184, 0.10) !important;
        }

        html.dark .fisio-sidebar-shell .fisio-sidebar-profile-card,
        body.dark .fisio-sidebar-shell .fisio-sidebar-profile-card,
        :root[data-theme="dark"] .fisio-sidebar-shell .fisio-sidebar-profile-card {
          background: rgba(255, 255, 255, 0.065) !important;
          border: 1px solid rgba(148, 163, 184, 0.10) !important;
          box-shadow: 0 16px 34px -28px rgba(59, 130, 246, 0.45) !important;
        }

        /* =========================================================
           Figuras de fisioterapia no fundo do Sidebar
           Sem afetar header/logo
           ========================================================= */
        .fisio-sidebar-shell {
          position: relative;
          overflow: hidden;
        }

        .fisio-sidebar-physio-bg {
          position: absolute;
          left: 0;
          right: 0;
          top: 116px;
          bottom: 96px;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .fisio-sidebar-physio-bg svg {
          position: absolute;
          color: rgba(124, 58, 237, 0.24);
          stroke: currentColor;
          fill: none;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .fisio-bg-dots {
          position: absolute;
          width: 76px;
          height: 76px;
          opacity: 0.28;
          background-image: radial-gradient(circle, rgba(124, 58, 237, 0.48) 1.5px, transparent 1.5px);
          background-size: 13px 13px;
        }

        .fisio-bg-line {
          position: absolute;
          width: 220px;
          height: 120px;
          border: 2px dashed rgba(124, 58, 237, 0.16);
          border-color: rgba(124, 58, 237, 0.16) transparent transparent transparent;
          border-radius: 50%;
          transform: rotate(-18deg);
        }

        .fisio-sidebar-shell nav,
        .fisio-sidebar-profile-area {
          position: relative;
          z-index: 2;
        }

        html.dark .fisio-sidebar-physio-bg svg,
        body.dark .fisio-sidebar-physio-bg svg,
        :root[data-theme="dark"] .fisio-sidebar-physio-bg svg {
          color: rgba(96, 165, 250, 0.12);
        }

        html.dark .fisio-bg-dots,
        body.dark .fisio-bg-dots,
        :root[data-theme="dark"] .fisio-bg-dots {
          opacity: 0.15;
          background-image: radial-gradient(circle, rgba(96, 165, 250, 0.42) 1.5px, transparent 1.5px);
        }

        html.dark .fisio-bg-line,
        body.dark .fisio-bg-line,
        :root[data-theme="dark"] .fisio-bg-line {
          border-color: rgba(96, 165, 250, 0.11) transparent transparent transparent;
        }
      `}</style>

      <div className="fisio-sidebar-shell flex flex-col h-full bg-background border-r border-white/5">
        {/* Logo Section */}
        <div className="fisio-sidebar-logo-area p-6 border-b border-white/5">
          <Link to="/dashboard" onClick={() => setIsOpen(false)}>
            <Logo size="sm" variant="light" />
          </Link>
        </div>

        {/* Background physiotherapy illustrations - abaixo do header */}
        <div className="fisio-sidebar-physio-bg" aria-hidden="true">
          <div className="fisio-bg-dots" style={{ top: 28, right: 34 }} />
          <div className="fisio-bg-dots" style={{ top: 330, right: 52 }} />
          <div className="fisio-bg-dots" style={{ bottom: 130, left: 56 }} />
          <div className="fisio-bg-line" style={{ top: 70, right: -42 }} />
          <div className="fisio-bg-line" style={{ top: 420, left: 110, transform: 'rotate(22deg)' }} />

          {/* Alongamento cervical / tronco */}
          <svg width="150" height="170" viewBox="0 0 150 170" style={{ top: 6, right: 8, opacity: 0.48 }}>
            <path d="M75 28c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20Z" />
            <path d="M75 69v54" />
            <path d="M48 91c18 5 36 5 54 0" />
            <path d="M75 83c-15 16-25 31-31 50" />
            <path d="M75 83c16 16 28 31 35 50" />
            <path d="M45 45c-18 7-29 20-34 39" />
            <path d="M105 45c16-4 27-14 34-30" />
          </svg>

          {/* Fisioterapeuta mobilizando perna */}
          <svg width="230" height="160" viewBox="0 0 230 160" style={{ top: 160, right: -28, opacity: 0.46 }}>
            <path d="M60 120h92" />
            <path d="M45 118c21-18 48-18 72 0" />
            <path d="M112 112c16-21 23-39 28-62" />
            <path d="M140 50c10 6 17 15 22 27" />
            <path d="M162 76c13 2 25 0 38-7" />
            <path d="M169 35c9 0 16 7 16 16s-7 16-16 16-16-7-16-16 7-16 16-16Z" />
            <path d="M169 68v43" />
            <path d="M151 88c13 7 27 9 42 4" />
            <path d="M92 108c23-6 39-15 48-58" />
            <path d="M44 120c-17 0-31 7-39 20" />
          </svg>

          {/* Coluna */}
          <svg width="90" height="250" viewBox="0 0 90 250" style={{ top: 330, left: -6, opacity: 0.44 }}>
            <path d="M46 8c-8 16-9 29-2 42 8 15 6 26-2 41-8 14-8 28 0 42 8 13 8 27 0 42-8 14-7 29 3 45" />
            {Array.from({ length: 12 }).map((_, i) => (
              <path
                key={i}
                d={`M38 ${22 + i * 17}c12-5 24-5 36 0M36 ${30 + i * 17}c14 5 27 5 40 0`}
              />
            ))}
          </svg>

          {/* Joelho */}
          <svg width="120" height="150" viewBox="0 0 120 150" style={{ top: 390, right: 20, opacity: 0.42 }}>
            <path d="M42 8c10 29 13 52 8 74" />
            <path d="M78 8c-10 29-13 52-8 74" />
            <path d="M50 83c-8 10-10 22-6 34" />
            <path d="M70 83c8 10 10 22 6 34" />
            <path d="M39 74c14 10 28 10 42 0" />
            <path d="M43 118c9 14 25 17 35 0" />
          </svg>

          {/* Faixa elástica */}
          <svg width="160" height="90" viewBox="0 0 160 90" style={{ top: 525, right: 44, opacity: 0.46 }}>
            <path d="M18 48c23-30 54-30 77 0 16 21 31 21 47 0" />
            <path d="M18 60c23-30 54-30 77 0 16 21 31 21 47 0" />
          </svg>

          {/* Exercício com elástico */}
          <svg width="180" height="210" viewBox="0 0 180 210" style={{ bottom: 8, right: 0, opacity: 0.46 }}>
            <path d="M82 22c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z" />
            <path d="M82 60v58" />
            <path d="M82 83c-22 10-35 26-42 49" />
            <path d="M82 83c20 9 35 24 45 45" />
            <path d="M72 118l-22 58" />
            <path d="M96 118l38 54" />
            <path d="M48 176h32" />
            <path d="M121 174h36" />
            <path d="M42 132c26-9 57-10 91-4" />
          </svg>

          {/* Halter e banco */}
          <svg width="170" height="120" viewBox="0 0 170 120" style={{ bottom: 20, left: 66, opacity: 0.34 }}>
            <path d="M20 48h42" />
            <path d="M108 48h42" />
            <path d="M62 48h46" />
            <path d="M18 31v34M32 27v42M148 31v34M134 27v42" />
            <path d="M34 96h92" />
            <path d="M48 96l-12 20M112 96l18 20" />
          </svg>
        </div>

        {/* Navigation Sections */}
        <nav className="relative z-10 flex-1 overflow-y-auto py-5 px-4 space-y-5 custom-scrollbar">
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
        <div className="relative z-10 fisio-sidebar-profile-area p-4 border-t border-white/5">
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
