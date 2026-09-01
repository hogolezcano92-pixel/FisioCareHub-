import React from 'react';
import { AlertTriangle, Lock, ShieldCheck, ArrowRight, CreditCard, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionBlockOverlayProps {
  planName?: string;
  expiredDateStr?: string;
  reason?: string;
  onOpenCardUpdate?: () => void;
  onReactivate?: () => void;
}

export const SubscriptionBlockOverlay: React.FC<SubscriptionBlockOverlayProps> = ({
  planName = 'PRO',
  expiredDateStr = 'recentemente',
  reason = 'O período de teste gratuito de 60 dias expirou e a cobrança automática não foi processada.',
  onOpenCardUpdate,
  onReactivate
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="subscription-theme subscription-card bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-scale-up">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-500" />

        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-200/60 shadow-inner">
          <Lock size={32} />
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
          Seu período de avaliação terminou
        </h2>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium max-w-md mx-auto">
          {reason}
        </p>

        {/* Info Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Plano Anterior:</span>
            <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">{planName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Data de Expiração:</span>
            <span className="font-bold text-slate-700">{expiredDateStr}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Seus Dados de Pacientes:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={14} /> 100% Protegidos
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onReactivate && (
            <button
              onClick={onReactivate}
              className="subscription-on-color w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <RefreshCw size={16} /> Reativar Minha Assinatura
            </button>
          )}

          {onOpenCardUpdate && (
            <button
              onClick={onOpenCardUpdate}
              className="subscription-primary-dark w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <CreditCard size={16} /> Alterar Cartão de Crédito
            </button>
          )}

          <button
            onClick={() => navigate('/subscription')}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Ver Detalhes da Assinatura <ArrowRight size={14} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium mt-6">
          Nenhum dado, prontuário ou histórico de paciente é excluído. Ao reativar sua assinatura, todo o acesso é restaurado instantaneamente.
        </p>
      </div>
    </div>
  );
};
