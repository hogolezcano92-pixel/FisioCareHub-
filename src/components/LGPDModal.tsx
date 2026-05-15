import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  LockKeyhole,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function LGPDModal() {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const isLegalPage =
    location.pathname === '/termos' ||
    location.pathname === '/privacidade' ||
    location.pathname.startsWith('/termos/') ||
    location.pathname.startsWith('/privacidade/');

  useEffect(() => {
    if (isLegalPage) {
      setVisible(false);
      setIsClosing(false);
      return;
    }

    const accepted = localStorage.getItem('lgpdAccepted');
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }

    setVisible(false);
  }, [isLegalPage]);

  const handleAccept = async () => {
    setIsClosing(true);

    localStorage.setItem('lgpdAccepted', 'true');

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            lgpd_aceito: true,
            lgpd_data_aceite: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao salvar consentimento no banco:', error);
      }
    }

    setTimeout(() => {
      setVisible(false);
      setIsClosing(false);
    }, 400);
  };

  if (isLegalPage || (!visible && !isClosing)) return null;

  return (
    <AnimatePresence>
      {(visible || isClosing) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2.25rem] border border-white/30 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]"
          >
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="relative p-7 sm:p-10">
              <div className="absolute right-[-70px] top-[-70px] h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute bottom-[-70px] left-[-70px] h-44 w-44 rounded-full bg-purple-500/10 blur-3xl" />

              <div className="relative">
                <div className="mb-7 flex items-start gap-4 text-left">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                    <ShieldCheck size={34} />
                  </div>

                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                      <LockKeyhole size={12} />
                      Proteção de dados
                    </div>

                    <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                      Seus dados, sua segurança 🔐
                    </h2>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <p className="text-base font-medium leading-relaxed text-slate-700 sm:text-lg">
                    Para continuar usando o <strong className="text-slate-950">FisioCareHub</strong>, confirme que você leu e concorda com nossos Termos de Uso e Política de Privacidade.
                  </p>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-inner">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <p className="text-sm font-semibold leading-relaxed text-slate-700">
                        Tratamos suas informações conforme a <strong className="text-slate-950">LGPD</strong>, com foco em segurança, transparência e proteção dos seus dados pessoais e de saúde.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a
                    href="/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-blue-700 transition-all hover:border-blue-200 hover:bg-blue-100"
                  >
                    <FileText size={15} />
                    Termos de Uso
                    <ExternalLink size={12} />
                  </a>

                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-indigo-700 transition-all hover:border-indigo-200 hover:bg-indigo-100"
                  >
                    <Eye size={15} />
                    Privacidade
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="mt-9 space-y-3">
                  <button
                    onClick={handleAccept}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 text-lg font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-blue-500/40 active:scale-[0.98]"
                  >
                    Aceitar e continuar
                    <ChevronRight size={22} className="transition-transform group-hover:translate-x-1" />
                  </button>

                  <a
                    href="/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-950"
                  >
                    Ver termos completos
                    <ExternalLink size={14} />
                  </a>
                </div>

                <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  FisioCareHub • Plataforma de Gestão em Fisioterapia
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
