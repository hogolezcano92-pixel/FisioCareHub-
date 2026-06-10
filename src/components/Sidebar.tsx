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
           Figuras reais de fisioterapia no fundo do Sidebar
           - Sem entrar no header/logo
           - Ilustrações mais nítidas no tema claro
           - Discretas no dark mode
           ========================================================= */
        .fisio-sidebar-shell {
          position: relative;
          overflow: hidden;
        }

        .fisio-sidebar-physio-bg {
          position: absolute;
          left: 0;
          right: 0;
          top: 118px;
          bottom: 96px;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          opacity: 1;
        }

        .fisio-sidebar-physio-bg svg {
          position: absolute;
          overflow: visible;
        }

        .fisio-illustration {
          color: rgba(124, 58, 237, 0.30);
          stroke: currentColor;
          fill: none;
          stroke-width: 2.05;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 10px 26px rgba(124, 58, 237, 0.08));
        }

        .fisio-illustration .soft-fill {
          fill: currentColor;
          opacity: 0.075;
          stroke: none;
        }

        .fisio-illustration .detail-soft {
          opacity: 0.72;
        }

        .fisio-bg-dots {
          position: absolute;
          width: 82px;
          height: 82px;
          opacity: 0.28;
          background-image: radial-gradient(circle, rgba(124, 58, 237, 0.42) 1.45px, transparent 1.45px);
          background-size: 13px 13px;
        }

        .fisio-bg-orb {
          position: absolute;
          width: 126px;
          height: 126px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.11), transparent 68%);
          filter: blur(1px);
        }

        .fisio-bg-flow-line {
          position: absolute;
          width: 260px;
          height: 130px;
          border: 2px dashed rgba(124, 58, 237, 0.15);
          border-color: rgba(124, 58, 237, 0.15) transparent transparent transparent;
          border-radius: 50%;
        }

        .fisio-sidebar-shell nav,
        .fisio-sidebar-profile-area {
          position: relative;
          z-index: 2;
        }

        html.dark .fisio-illustration,
        body.dark .fisio-illustration,
        :root[data-theme="dark"] .fisio-illustration {
          color: rgba(96, 165, 250, 0.13);
          filter: drop-shadow(0 8px 22px rgba(59, 130, 246, 0.06));
        }

        html.dark .fisio-illustration .soft-fill,
        body.dark .fisio-illustration .soft-fill,
        :root[data-theme="dark"] .fisio-illustration .soft-fill {
          opacity: 0.055;
        }

        html.dark .fisio-bg-dots,
        body.dark .fisio-bg-dots,
        :root[data-theme="dark"] .fisio-bg-dots {
          opacity: 0.13;
          background-image: radial-gradient(circle, rgba(96, 165, 250, 0.40) 1.45px, transparent 1.45px);
        }

        html.dark .fisio-bg-orb,
        body.dark .fisio-bg-orb,
        :root[data-theme="dark"] .fisio-bg-orb {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.09), transparent 68%);
        }

        html.dark .fisio-bg-flow-line,
        body.dark .fisio-bg-flow-line,
        :root[data-theme="dark"] .fisio-bg-flow-line {
          border-color: rgba(96, 165, 250, 0.09) transparent transparent transparent;
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
          <div className="fisio-bg-orb" style={{ top: 0, right: 28 }} />
          <div className="fisio-bg-orb" style={{ top: 360, right: -42 }} />
          <div className="fisio-bg-orb" style={{ bottom: 70, left: 10 }} />
          <div className="fisio-bg-dots" style={{ top: 34, right: 28 }} />
          <div className="fisio-bg-dots" style={{ top: 285, right: 54 }} />
          <div className="fisio-bg-dots" style={{ bottom: 150, left: 58 }} />
          <div className="fisio-bg-flow-line" style={{ top: 78, right: -60, transform: 'rotate(-18deg)' }} />
          <div className="fisio-bg-flow-line" style={{ top: 430, left: 92, transform: 'rotate(19deg)' }} />

          {/* Anatomia posterior: coluna, escápulas e músculos */}
          <svg
            className="fisio-illustration"
            width="210"
            height="210"
            viewBox="0 0 210 210"
            style={{ top: 0, right: -18, opacity: 0.62 }}
          >
            <path className="soft-fill" d="M105 28c36 0 65 30 65 68 0 32-18 52-28 77H68c-11-25-28-45-28-77 0-38 29-68 65-68Z" />
            <path d="M105 18c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20Z" />
            <path d="M105 58c-4 17-4 36 0 56 4 21 3 42-2 64" />
            <path d="M95 64c-18 7-31 20-39 40" />
            <path d="M115 64c18 7 31 20 39 40" />
            <path d="M70 83c12 7 23 10 34 8" />
            <path d="M140 83c-12 7-23 10-34 8" />
            <path d="M78 118c17-6 35-7 54 0" />
            <path d="M67 152c26 8 50 8 76 0" />
            <path className="detail-soft" d="M105 73c-6 7-6 14 0 21M105 94c-7 8-7 16 0 24M105 118c-6 9-6 18 0 28M105 146c-6 8-6 17-2 27" />
            <path className="detail-soft" d="M62 107c-12 10-20 25-22 43M148 107c12 10 20 25 22 43" />
            <path d="M40 153c11 9 24 13 38 13" />
            <path d="M170 153c-11 9-24 13-38 13" />
          </svg>

          {/* Atendimento fisioterapêutico: mobilização de joelho/perna */}
          <svg
            className="fisio-illustration"
            width="255"
            height="190"
            viewBox="0 0 255 190"
            style={{ top: 150, right: -38, opacity: 0.64 }}
          >
            <path className="soft-fill" d="M38 137c42-39 96-35 146-6 18 10 36 14 62 10v21H22c1-10 6-18 16-25Z" />
            <path d="M31 146h122" />
            <path d="M42 142c26-22 58-23 91-4" />
            <path d="M23 147c-9 6-15 13-18 23" />
            <path d="M78 122c28-3 54-17 75-47" />
            <path d="M151 75c13 7 25 16 38 29" />
            <path d="M187 103c18 0 33-5 50-17" />
            <path d="M70 122c-16-6-30-3-43 8" />
            <path d="M182 30c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z" />
            <path d="M182 67v58" />
            <path d="M158 91c18 11 37 13 56 5" />
            <path d="M161 123c-10 16-17 31-20 48" />
            <path d="M199 124c10 14 23 25 38 33" />
            <path d="M146 78c3-20 10-35 22-45" />
            <path d="M142 80c9-3 18-2 27 3" />
            <path className="detail-soft" d="M86 126c21-8 39-21 54-42" />
            <path className="detail-soft" d="M146 84c5 10 9 20 12 30" />
          </svg>

          {/* Joelho anatômico */}
          <svg
            className="fisio-illustration"
            width="145"
            height="170"
            viewBox="0 0 145 170"
            style={{ top: 335, right: 18, opacity: 0.58 }}
          >
            <path className="soft-fill" d="M38 12h69c-4 29-5 51-2 69 3 19 12 36 22 57H18c10-21 19-38 22-57 3-18 2-40-2-69Z" />
            <path d="M47 10c10 31 13 56 8 80" />
            <path d="M98 10c-10 31-13 56-8 80" />
            <path d="M55 89c-11 10-16 25-13 43" />
            <path d="M90 89c11 10 16 25 13 43" />
            <path d="M43 76c18 13 40 13 59 0" />
            <path d="M48 132c15 17 34 17 49 0" />
            <path d="M59 96c9 7 18 7 27 0" />
            <path className="detail-soft" d="M35 63c22 8 49 8 76 0" />
            <path className="detail-soft" d="M53 145c13 8 26 8 39 0" />
          </svg>

          {/* Pessoa alongando lateral */}
          <svg
            className="fisio-illustration"
            width="215"
            height="230"
            viewBox="0 0 215 230"
            style={{ top: 418, right: -12, opacity: 0.58 }}
          >
            <path className="soft-fill" d="M79 74c42-9 82 20 87 63 5 44-25 75-68 76-42 0-73-27-77-68-4-34 19-62 58-71Z" />
            <path d="M118 24c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z" />
            <path d="M117 62c-17 20-26 41-28 65" />
            <path d="M107 79c-28 2-49 14-64 36" />
            <path d="M107 79c25 11 45 29 60 55" />
            <path d="M91 127c-22 19-43 33-65 42" />
            <path d="M90 128c20 21 45 36 75 46" />
            <path d="M24 170h55" />
            <path d="M143 174h54" />
            <path d="M82 119c-7 18-17 34-30 49" />
            <path d="M119 34c19 2 33-5 43-22" />
            <path className="detail-soft" d="M64 92c21-11 43-14 67-8" />
            <path className="detail-soft" d="M125 93c14 10 25 22 34 38" />
          </svg>

          {/* Faixa elástica / equipamento funcional */}
          <svg
            className="fisio-illustration"
            width="185"
            height="112"
            viewBox="0 0 185 112"
            style={{ top: 568, right: 36, opacity: 0.56 }}
          >
            <path className="soft-fill" d="M21 58c31-39 73-39 104 0 17 21 30 23 39 6 5-9 5-18 0-26-11 21-23 18-39-2C94-3 52-3 21 36c-9 11-9 22 0 22Z" />
            <path d="M16 50c29-38 71-39 101-2 17 20 31 22 45 1" />
            <path d="M19 70c29-38 71-39 101-2 17 20 31 22 45 1" />
            <path d="M17 50c-10 4-14 12-10 21 4 9 13 12 22 6" />
            <path d="M165 49c11-3 19 3 20 13 1 10-6 17-18 16" />
            <path className="detail-soft" d="M59 29c14-8 29-8 44 0" />
          </svg>

          {/* Mesa/aparelho de fisioterapia + halter */}
          <svg
            className="fisio-illustration"
            width="210"
            height="160"
            viewBox="0 0 210 160"
            style={{ bottom: 18, right: -10, opacity: 0.52 }}
          >
            <path className="soft-fill" d="M20 96h114v24H20z" />
            <path d="M20 96h114" />
            <path d="M34 96l-16 44" />
            <path d="M115 96l20 44" />
            <path d="M137 95h45c8 0 14 6 14 14v31" />
            <path d="M150 109h34" />
            <path d="M167 109v31" />
            <path d="M155 140h36" />
            <path d="M38 50h34" />
            <path d="M118 50h34" />
            <path d="M72 50h46" />
            <path d="M35 34v32M50 29v42M155 34v32M140 29v42" />
            <path d="M46 126c-7 0-13 6-13 13s6 13 13 13 13-6 13-13-6-13-13-13Z" />
            <path d="M83 126c-7 0-13 6-13 13s6 13 13 13 13-6 13-13-6-13-13-13Z" />
            <path d="M59 139h11" />
          </svg>

          {/* Coluna lateral detalhada */}
          <svg
            className="fisio-illustration"
            width="82"
            height="260"
            viewBox="0 0 82 260"
            style={{ top: 470, left: -3, opacity: 0.50 }}
          >
            <path className="soft-fill" d="M34 8c28 33 28 70 6 111-17 31-14 70 15 119H24c-27-47-30-85-11-118C36 80 37 44 34 8Z" />
            <path d="M39 8c-11 20-11 37-1 55 11 20 9 36-2 56-11 20-10 39 2 58 10 17 11 34 2 55" />
            <path d="M32 24c13-6 27-5 41 2" />
            <path d="M29 42c14-5 28-4 42 3" />
            <path d="M30 61c14-5 27-4 40 3" />
            <path d="M28 81c15-6 30-5 44 3" />
            <path d="M26 103c14-5 29-5 45 2" />
            <path d="M24 126c16-6 32-5 48 4" />
            <path d="M25 150c16-5 32-4 47 4" />
            <path d="M27 174c15-4 29-2 43 6" />
            <path d="M30 198c13-3 26-1 38 6" />
            <path d="M34 222c10-1 20 2 30 8" />
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
