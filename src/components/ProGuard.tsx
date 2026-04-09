import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'full' | 'inline';
}

export default function ProGuard({ children, fallback, variant = 'full' }: ProGuardProps) {
  const { profile, subscription, loading } = useAuth();

  if (loading) {
    return variant === 'full' ? (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ) : null;
  }

  // Pacientes e Admins sempre têm acesso
  if (profile?.tipo_usuario === 'paciente' || profile?.plano === 'admin') {
    return <>{children}</>;
  }

  // Fisioterapeutas precisam ser Pro
  if (profile?.tipo_usuario === 'fisioterapeuta') {
    const isPro = profile?.plano === 'pro' || profile?.is_pro === true || subscription?.status === 'ativo';
    
    if (isPro) {
      return <>{children}</>;
    }

    if (fallback) return <>{fallback}</>;

    if (variant === 'inline') {
      return (
        <Link
          to="/subscription"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100 hover:bg-amber-100 transition-all"
        >
          <Crown size={12} />
          Desbloquear Pro
        </Link>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-dashed border-sky-100 rounded-[2rem] p-12 text-center shadow-sm"
      >
        <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Crown size={40} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">🔒 Recurso exclusivo PRO</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg leading-relaxed">
          Assine o plano PRO por R$49,99/mês para desbloquear todos os recursos avançados e turbine sua clínica.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/subscription"
            className="px-8 py-4 bg-sky-500 text-white rounded-full font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 flex items-center gap-2"
          >
            Assinar PRO
            <ArrowRight size={20} />
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-slate-50 text-slate-600 rounded-full font-black text-lg hover:bg-slate-100 transition-all"
          >
            Voltar
          </button>
        </div>
      </motion.div>
    );
  }

  // Se não houver perfil ou tipo desconhecido, bloqueia por segurança
  return (
    <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100">
      <Lock className="mx-auto mb-2" />
      <p className="font-bold">Acesso Restrito</p>
    </div>
  );
}
