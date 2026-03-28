import React from 'react';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSubscription } from '../hooks/useSubscription';

interface GatekeeperProps {
  children: React.ReactNode;
  featureId?: string;
  className?: string;
  overlayClassName?: string;
}

export function Gatekeeper({ children, featureId, className, overlayClassName }: GatekeeperProps) {
  const { isPro, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-slate-100 rounded-3xl h-64 w-full", className)} />
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative group overflow-hidden rounded-[2.5rem]", className)}>
      {/* Blurred Content */}
      <div className="opacity-40 grayscale pointer-events-none select-none filter blur-[2px]">
        {children}
      </div>

      {/* Lock Overlay */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/60 backdrop-blur-[2px] z-20 transition-all group-hover:bg-white/80",
        overlayClassName
      )}>
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl mb-6 animate-bounce-slow">
          <Lock size={32} />
        </div>
        
        <div className="space-y-3 max-w-xs mx-auto">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recurso Pro</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Este recurso está disponível exclusivamente para assinantes do Plano Pro.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/assinatura')}
          className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 group/btn"
        >
          <Zap size={18} fill="currentColor" />
          Fazer Upgrade Agora
          <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
