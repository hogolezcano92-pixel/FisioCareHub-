import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  HelpCircle,
  LogOut,
  MessageCircle,
  RefreshCcw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

export default function AguardandoAprovacao() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const status = String(profile?.status_aprovacao || '').toLowerCase();
  const isRejected = status === 'reprovado' || status === 'rejeitado';
  const rejectionReason = String((profile as any)?.motivo_reprovacao || '').trim();

  const supportMessage = isRejected
    ? 'Olá, preciso de ajuda para corrigir meu cadastro profissional no FisioCareHub.'
    : 'Olá, gostaria de acompanhar a análise do meu cadastro profissional no FisioCareHub.';

  const supportUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(supportMessage)}`;

  const steps = isRejected
    ? [
        { label: 'Cadastro recebido', status: 'done' },
        { label: 'Análise concluída', status: 'done' },
        { label: 'Correções necessárias', status: 'active' },
        { label: 'Nova análise', status: 'pending' }
      ]
    : [
        { label: 'Cadastro enviado', status: 'done' },
        { label: 'Documentos em análise', status: 'active' },
        { label: 'Aprovação do perfil', status: 'pending' },
        { label: 'Acesso liberado', status: 'pending' }
      ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f8fafc_42%,#ffffff_100%)] flex flex-col items-center justify-center px-5 py-10 overflow-hidden relative">
      <div className="absolute top-[-120px] right-[-120px] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-140px] left-[-140px] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8"
      >
        <Logo />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-lg w-full"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.45)] overflow-hidden">
          <div className={cn(
            "h-2 w-full",
            isRejected
              ? "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400"
              : "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400"
          )} />

          <div className="p-7 sm:p-10 text-center">
            <div className={cn(
              "mx-auto mb-6 w-24 h-24 rounded-[2rem] flex items-center justify-center border shadow-lg",
              isRejected
                ? "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100"
                : "bg-amber-50 text-amber-500 border-amber-100 shadow-amber-100"
            )}>
              {isRejected ? <ShieldAlert size={44} /> : <Clock size={44} />}
            </div>

            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.22em] mb-5 border",
              isRejected
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-blue-50 text-blue-600 border-blue-100"
            )}>
              {isRejected ? <AlertCircle size={14} /> : <Sparkles size={14} />}
              {isRejected ? 'Ação necessária' : 'Análise em andamento'}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 mb-4 tracking-tight leading-tight">
              {isRejected ? 'Cadastro precisa de ajustes' : 'Cadastro em análise'}
            </h1>

            <p className="text-slate-600 font-semibold leading-relaxed text-base sm:text-lg max-w-md mx-auto">
              {isRejected
                ? 'Nossa equipe analisou seu cadastro profissional e identificou informações ou documentos que precisam ser corrigidos.'
                : 'Seu perfil profissional foi recebido com sucesso e está sendo revisado pela nossa equipe antes da liberação do acesso completo.'}
            </p>

            {isRejected && rejectionReason && (
              <div className="mt-6 text-left bg-rose-50 border border-rose-100 rounded-3xl p-5">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">
                  Motivo informado pela análise
                </p>
                <p className="text-sm font-bold text-rose-800 leading-relaxed">
                  {rejectionReason}
                </p>
              </div>
            )}

            <div className="mt-8 bg-slate-50 border border-slate-100 rounded-3xl p-5 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Próximas etapas
              </p>

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      step.status === 'done' && "bg-emerald-50 border-emerald-100 text-emerald-600",
                      step.status === 'active' && !isRejected && "bg-amber-50 border-amber-100 text-amber-600",
                      step.status === 'active' && isRejected && "bg-rose-50 border-rose-100 text-rose-600",
                      step.status === 'pending' && "bg-white border-slate-200 text-slate-300"
                    )}>
                      {step.status === 'done' ? (
                        <CheckCircle2 size={17} />
                      ) : step.status === 'active' ? (
                        isRejected ? <AlertCircle size={17} /> : <RefreshCcw size={17} />
                      ) : (
                        <span className="text-[11px] font-black">{index + 1}</span>
                      )}
                    </div>

                    <span className={cn(
                      "text-sm font-black",
                      step.status === 'done' && "text-slate-700",
                      step.status === 'active' && !isRejected && "text-amber-700",
                      step.status === 'active' && isRejected && "text-rose-700",
                      step.status === 'pending' && "text-slate-400"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3">
              {!isRejected && (
                <div className="flex items-start gap-3 text-left bg-blue-50/70 border border-blue-100 rounded-3xl p-4">
                  <FileCheck2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 leading-relaxed">
                    Assim que seu perfil for aprovado, você receberá uma confirmação por e-mail e poderá acessar sua área profissional.
                  </p>
                </div>
              )}

              {isRejected && (
                <div className="flex items-start gap-3 text-left bg-amber-50/80 border border-amber-100 rounded-3xl p-4">
                  <HelpCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-relaxed">
                    Acesse sua conta, revise seus dados em Minha Conta ou Perfil Profissional e envie novamente para análise.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-4">
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-5 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                <MessageCircle size={21} />
                Falar com Suporte
              </a>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-3 w-full py-5 bg-slate-100 text-slate-700 rounded-2xl font-black hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                <LogOut size={21} />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="relative z-10 mt-10 text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">
        FisioCareHub &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
