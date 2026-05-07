import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PartyPopper, CheckCircle2, Star, ArrowRight, ShieldCheck, Zap, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ApprovalWelcomeModalProps {
  onClose: () => void;
}

export default function ApprovalWelcomeModal({ onClose }: ApprovalWelcomeModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContinueFree = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ 
          welcome_seen: true,
          plano: 'free'
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      await refreshProfile();
      onClose();
    } catch (err) {
      console.error('Error updating welcome status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlans = () => {
    // We don't mark as seen here yet, or maybe we should?
    // User request: "usuário pode voltar e continuar no FREE"
    // So we just navigate to plans page.
    navigate('/subscription');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => {}} // Non-dismissable by backdrop click to ensure they choose
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
        >
          {/* Header Highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

          <div className="p-8 sm:p-12 text-center space-y-8">
            {/* Icon */}
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse" />
              <div className="relative w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center">
                <PartyPopper className="w-10 h-10 text-blue-400" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Seu perfil foi aprovado 🎉
              </h2>
              <p className="text-slate-400 text-lg font-medium">
                Agora você já pode aparecer para pacientes na plataforma.
              </p>
            </div>

            {/* Content Box */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 text-left">
              <p className="text-white font-black uppercase tracking-widest text-xs">
                Escolha como deseja destacar seu perfil:
              </p>
              
              <div className="grid gap-4">
                {[
                  { icon: Star, text: "Mais destaque nos resultados", color: "text-amber-400" },
                  { icon: TrendingUp, text: "Mais visibilidade para pacientes", color: "text-emerald-400" },
                  { icon: Zap, text: "Recursos profissionais avançados", color: "text-blue-400" }
                ].map((benefit, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <benefit.icon className={`w-4 h-4 ${benefit.color}`} />
                    </div>
                    <span className="text-slate-200 font-bold">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleViewPlans}
                className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 group"
              >
                Ver planos profissionais
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                disabled={loading}
                onClick={handleContinueFree}
                className="flex-1 px-8 py-5 bg-white/5 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
              >
                {loading ? "Processando..." : "Continuar gratuitamente"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
