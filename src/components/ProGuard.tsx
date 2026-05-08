import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import ProBanner from './ProBanner';
import { cn } from '../lib/utils';

interface ProGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'full' | 'inline';
  requiredPlan?: 'free' | 'basic' | 'pro';
  className?: string;
}

export default function ProGuard({ children, fallback, variant = 'full', requiredPlan = 'pro', className }: ProGuardProps) {
  const { profile, subscription, loading } = useAuth();

  if (loading) {
    return variant === 'full' ? (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ) : null;
  }

  // Pacientes e Admins sempre têm acesso
  if (profile?.tipo_usuario === 'paciente' || profile?.plano === 'admin') {
    return <>{children}</>;
  }

  // Fisioterapeutas
  if (profile?.tipo_usuario === 'fisioterapeuta') {
    const userPlan = profile?.plan_type || profile?.plano || 'free';
    const isPro = userPlan === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';
    const isBasic = userPlan === 'basic' || isPro;
    const isFree = true; // Todo fisio tem acesso ao nível free

    let hasAccess = false;
    if (requiredPlan === 'pro') hasAccess = isPro;
    else if (requiredPlan === 'basic') hasAccess = isBasic;
    else hasAccess = isFree;
    
    if (hasAccess) {
      return <>{children}</>;
    }

    if (fallback) return <>{fallback}</>;

    if (variant === 'inline') {
      return (
        <div className={className}>
          <ProBanner />
        </div>
      );
    }

    return (
      <div className={cn("relative group", className)}>
        <div className="blur-sm pointer-events-none select-none opacity-50 transition-all duration-500 group-hover:blur-md">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6 z-20">
          <div className="w-full max-w-2xl transform transition-all duration-500 group-hover:scale-105">
            <ProBanner />
          </div>
        </div>
      </div>
    );
  }

  // Se não houver perfil ou tipo desconhecido, bloqueia por segurança
  return (
    <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/20">
      <Lock className="mx-auto mb-2" />
      <p className="font-bold">Acesso Restrito</p>
    </div>
  );
}

