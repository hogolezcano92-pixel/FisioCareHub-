import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  ChevronRight, 
  User, 
  Sparkles, 
  Crown, 
  Calendar, 
  Users, 
  FileText, 
  Activity, 
  LayoutDashboard, 
  BookOpen, 
  ShoppingBag, 
  ShieldCheck, 
  Plus,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeQuickToggle from './ThemeQuickToggle';
import { getEffectivePlan, hasPlanAccess, getPlanLabel } from '../lib/planAccess';
import { cn } from '../lib/utils';

export default function DesktopTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, subscription } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const currentPlan = getEffectivePlan(profile, subscription);
  const isPro = hasPlanAccess(currentPlan, 'pro');
  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';

  // Map route to breadcrumb & icon
  const routeMeta = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      return { title: 'Painel Principal', category: 'Visão Geral', icon: LayoutDashboard };
    }
    if (path.startsWith('/patients')) {
      return { title: 'Meus Pacientes', category: 'Gestão Clínica', icon: Users };
    }
    if (path.startsWith('/agenda')) {
      return { title: 'Agenda & Atendimentos', category: 'Planejamento', icon: Calendar };
    }
    if (path.startsWith('/records')) {
      return { title: 'Prontuários Eletrônicos', category: 'Gestão Clínica', icon: FileText };
    }
    if (path.startsWith('/clinical-tests')) {
      return { title: 'Clinical Tests Hub', category: 'Avaliação & Diagnóstico', icon: Stethoscope };
    }
    if (path.startsWith('/exercises') || path.startsWith('/treinos')) {
      return { title: 'Exercícios Terapêuticos', category: 'Prescrição', icon: Activity };
    }
    if (path.startsWith('/loja')) {
      return { title: 'Loja & Materiais', category: 'Produtos', icon: ShoppingBag };
    }
    if (path.startsWith('/biblioteca')) {
      return { title: 'Biblioteca de Saúde', category: 'Acervo Clínico', icon: BookOpen };
    }
    if (path.startsWith('/documents')) {
      return { title: 'Documentos & Contratos', category: 'Jurídico & Termos', icon: FileText };
    }
    if (path.startsWith('/admin')) {
      return { title: 'Painel Administrativo', category: 'Administração', icon: ShieldCheck };
    }
    if (path.startsWith('/subscription')) {
      return { title: 'Minha Assinatura', category: 'Plano & Cobrança', icon: Crown };
    }
    if (path.startsWith('/jornada')) {
      return { title: 'Minha Jornada de Recuperação', category: 'Evolução', icon: HeartPulse };
    }
    if (path.startsWith('/descubra')) {
      return { title: 'Descobrir Recurso & Profissionais', category: 'Rede', icon: Search };
    }
    return { title: 'FisioCareHub', category: 'Plataforma', icon: Sparkles };
  }, [location.pathname]);

  const RouteIcon = routeMeta.icon;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isPhysio) {
      navigate(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/descubra?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-8 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 transition-colors">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
          <RouteIcon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>FisioCareHub</span>
            <ChevronRight size={10} className="text-slate-600" />
            <span className="text-blue-400">{routeMeta.category}</span>
          </div>
          <h1 className="text-sm font-black text-white tracking-tight leading-none mt-0.5">
            {routeMeta.title}
          </h1>
        </div>
      </div>

      {/* Middle: Global Quick Search Input */}
      <div className="flex-1 max-w-md mx-8">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isPhysio ? "Buscar pacientes, prontuários, testes..." : "Buscar fisioterapeutas, materiais, dicas..."}
            className="w-full h-10 pl-10 pr-12 rounded-2xl bg-white/5 dark:bg-slate-800/40 border border-white/10 text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 bg-white/10 dark:bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
            ⌘K
          </span>
        </form>
      </div>

      {/* Right: Actions, Notifications, Theme, Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Action Button for Physio */}
        {isPhysio && (
          <button
            onClick={() => navigate('/patients?action=new')}
            className="hidden xl:flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={14} />
            <span>Novo Paciente</span>
          </button>
        )}

        {/* Plan Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
          <Crown size={14} className={isPro ? "text-amber-400" : "text-slate-400"} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">
            {getPlanLabel(currentPlan)}
          </span>
        </div>

        {/* Theme Toggle & Notifications */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <ThemeQuickToggle />
          <NotificationBell />
        </div>

        {/* User Mini Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
        >
          <img
            src={profile?.avatar_url || profile?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'user'}`}
            alt="Avatar"
            className="w-8 h-8 rounded-xl object-cover border border-white/10 shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="text-left hidden xl:block min-w-0">
            <p className="text-xs font-extrabold text-white truncate max-w-[120px]">
              {profile?.nome_completo || 'Usuário'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {profile?.tipo_usuario === 'fisioterapeuta' ? 'Fisioterapeuta' : profile?.tipo_usuario === 'admin' ? 'Admin' : 'Paciente'}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
