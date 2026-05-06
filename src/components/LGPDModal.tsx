import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function LGPDModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('fisiocare_lgpd_consent');
    if (!hasConsented) {
      // Small timeout to make it feel deliberate
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem('fisiocare_lgpd_consent', 'true');
      setIsOpen(false);
    }, 400);
  };

  const handleViewTerms = () => {
    window.location.href = '/termos-de-uso';
  };

  if (!isOpen && !isClosing) return null;

  return (
    <AnimatePresence>
      {(isOpen || isClosing) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden"
          >
            {/* Header / Accent */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Seus dados, sua segurança 🔐
                </h2>
              </div>

              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p className="text-base sm:text-lg">
                  Para oferecer a melhor experiência na gestão da sua clínica e tratamentos, utilizamos tecnologias para processar informações de acordo com a <strong>LGPD</strong>.
                </p>
                <p className="text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                  Ao clicar em "Aceitar", você concorda com o processamento de seus dados para fins de funcionalidade da plataforma, segurança e personalização de serviços.
                </p>
              </div>

              {/* Links Section */}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                <a 
                  href="/termos-de-uso" 
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                >
                  Termos de Uso <ExternalLink size={12} />
                </a>
                <a 
                  href="/politica-de-privacidade" 
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                >
                  Política de Privacidade <ExternalLink size={12} />
                </a>
              </div>

              {/* Actions */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center gap-2 group"
                >
                  Aceitar e continuar
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleViewTerms}
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
