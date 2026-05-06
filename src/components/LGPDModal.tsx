import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ExternalLink, ChevronRight } from 'lucide-react';

export default function LGPDModal() {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("lgpdAccepted");
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem("lgpdAccepted", "true");
      setVisible(false);
      setIsClosing(false);
    }, 400);
  };

  if (!visible && !isClosing) return null;

  return (
    <AnimatePresence>
      {(visible || isClosing) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden"
          >
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-6 text-left">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Seus dados, sua segurança 🔐
                </h2>
              </div>

              <div className="space-y-4 text-slate-600 leading-relaxed text-left">
                <p className="text-base sm:text-lg">
                  Utilizamos seus dados para melhorar sua experiência. Ao continuar, você concorda com nossos termos de uso e política de privacidade.
                </p>
                <p className="text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                  Para oferecer a melhor experiência na gestão da sua clínica e tratamentos, processamos informações de acordo com a <strong>LGPD</strong>.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                <a href="/termos-de-uso" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">
                  Termos de Uso <ExternalLink size={12} />
                </a>
                <a href="/politica-de-privacidade" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">
                  Política de Privacidade <ExternalLink size={12} />
                </a>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center gap-2 group"
                >
                  Aceitar e continuar
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => window.location.href = '/termos-de-uso'}
                  className="px-6 py-4 text-slate-500 font-bold hover:text-slate-900 transition-all rounded-2xl hover:bg-slate-100/50"
                >
                  Ver termos completos
                </button>
              </div>

              <p className="mt-8 text-center text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">
                FisioCareHub • Plataforma de Gestão em Fisioterapia
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
