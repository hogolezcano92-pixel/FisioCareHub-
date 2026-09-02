import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Zap, Key, Loader2, ArrowRight, Star, Sparkles, 
  Clock, CreditCard, RefreshCw, AlertCircle, CheckCircle2, Lock, HelpCircle, XCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getEffectivePlan, hasPlanAccess } from '../lib/planAccess';
import { 
  PLANS, PlanKey, SubscriptionDetails, fetchSubscriptionDetails, 
  cancelSubscription, reactivateSubscription, changeSubscriptionPlan 
} from '../services/subscriptionService';
import { StripeElementsModal } from '../components/StripeElementsModal';
import { SubscriptionBlockOverlay } from '../components/SubscriptionBlockOverlay';

export default function Subscription() {
  const { profile, subscription, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null);
  const [fetchingSub, setFetchingSub] = useState(true);

  // Modals state
  const [selectedPlanForSubscribe, setSelectedPlanForSubscribe] = useState<PlanKey | null>(null);
  const [showUpdateCardModal, setShowUpdateCardModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [proKey, setProKey] = useState('');

  const effectivePlan = getEffectivePlan(profile, subscription);
  const isPro = hasPlanAccess(effectivePlan, 'pro');

  const loadDetails = async () => {
    if (!profile?.id) return;
    setFetchingSub(true);
    try {
      const details = await fetchSubscriptionDetails(profile.id);
      setSubDetails(details);

      // O endpoint de detalhes reconcilia o estado com o Stripe. Se ele
      // recuperar um trial/assinatura válida que o AuthContext ainda não tinha,
      // atualizamos o contexto imediatamente para liberar os ProGuards.
      const serverHasAccess = Boolean(details && ['trialing', 'ativo', 'active'].includes(details.status));
      if (serverHasAccess && effectivePlan === 'free') {
        await refreshProfile();
      }
    } catch (err) {
      console.error('[Subscription] Failed to load details:', err);
    } finally {
      setFetchingSub(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [profile?.id]);

  const handleCancel = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await cancelSubscription(profile.id);
      toast.success('Assinatura programada para cancelamento', {
        description: 'Seu acesso continua ativo até o final do período atual.'
      });
      await refreshProfile();
      await loadDetails();
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error('Erro ao cancelar assinatura', {
        description: err.message || 'Tente novamente ou entre em contato com o suporte.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await reactivateSubscription(profile.id);
      toast.success('Assinatura reativada com sucesso!', {
        description: 'Aproveite seu acesso ao FisioCareHub.'
      });
      await refreshProfile();
      await loadDetails();
    } catch (err: any) {
      toast.error('Erro ao reativar assinatura', {
        description: err.message || 'Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (newPlanKey: PlanKey) => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await changeSubscriptionPlan({ userId: profile.id, newPlanKey });
      toast.success('Plano alterado com sucesso!', {
        description: `Seu novo plano é ${PLANS[newPlanKey].name}.`
      });
      await refreshProfile();
      await loadDetails();
      setShowPlanChangeModal(false);
    } catch (err: any) {
      toast.error('Erro ao alterar plano', {
        description: err.message || 'Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    if (proKey !== 'PRO2024' && proKey !== 'BASIC2024') {
      toast.error('Chave inválida', { description: 'Verifique a chave e tente novamente.' });
      return;
    }

    setLoading(true);
    try {
      const planType = proKey === 'PRO2024' ? 'pro' : 'basic';
      const { supabase } = await import('../lib/supabase');
      
      await supabase.from('assinaturas').upsert({
        user_id: profile.id,
        plano: planType,
        status: 'ativo',
        valor: planType === 'pro' ? 49.99 : 19.99,
        data_inicio: new Date().toISOString(),
        data_expiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      await supabase.from('perfis').update({
        is_pro: planType === 'pro',
        plano: planType,
        plan_type: planType,
        subscription_status: 'ativo'
      }).eq('id', profile.id);

      toast.success(`Chave ativada com sucesso! (${planType.toUpperCase()})`);
      setProKey('');
      setShowKeyInput(false);
      await refreshProfile();
      await loadDetails();
    } catch (err: any) {
      toast.error('Erro ao ativar chave:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.tipo_usuario === 'paciente') {
    return (
      <div className="subscription-theme subscription-page min-h-screen max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="subscription-card p-10 rounded-3xl border border-sky-100 shadow-xl">
          <ShieldCheck size={56} className="text-sky-600 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Você possui acesso VIP Gratuito!</h2>
          <p className="text-slate-600 max-w-xl mx-auto text-base leading-relaxed font-medium">
            Como paciente do FisioCareHub, todos os módulos de exercícios, consultas e prontuários vinculados estão 100% liberados sem custo.
          </p>
        </div>
      </div>
    );
  }

  const isTrialActive = subDetails?.isTrial && subDetails?.trialDaysRemaining > 0;
  const isSubscriptionActive = (subDetails?.status === 'ativo' || subDetails?.status === 'active' || isTrialActive) && subDetails?.status !== 'cancelado';
  const isBlocked = subDetails?.status === 'expirado' || subDetails?.status === 'past_due';

  return (
    <div className="subscription-theme subscription-page min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 text-sky-800 text-xs font-black uppercase tracking-wider border border-sky-200">
            <Sparkles size={14} className="text-sky-600" />
            60 Dias de Teste Gratuito
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Gestão de Assinatura
          </h1>
          <p className="text-slate-600 text-base font-medium">
            Experimente o FisioCareHub com 60 dias grátis em todos os planos. Sem compromisso, cancele quando quiser.
          </p>
        </div>

        {/* Banner Contagem Regressiva Trial (se trial ativo) */}
        {isTrialActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="subscription-on-color bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-600/15 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-xs font-extrabold uppercase px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
                    <Clock size={14} /> Trial Ativo
                  </span>
                  <span className="text-sky-100 text-xs font-semibold">
                    Ativado em {subDetails.trialStart ? new Date(subDetails.trialStart).toLocaleDateString('pt-BR') : 'recentemente'}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Seu teste gratuito termina em <span className="underline decoration-sky-300 underline-offset-4">{subDetails.trialDaysRemaining} {subDetails.trialDaysRemaining === 1 ? 'dia' : 'dias'}</span>
                </h3>
                <p className="text-sky-100 text-sm font-medium">
                  Primeira cobrança de {subDetails.amount ? subDetails.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 49,99'} apenas em{' '}
                  <strong>{subDetails.trialEnd ? new Date(subDetails.trialEnd).toLocaleDateString('pt-BR') : '60 dias'}</strong>.
                </p>
              </div>

              <div className="subscription-trial-counter bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[180px]">
                <span className="text-xs text-sky-100 font-bold uppercase tracking-wider block mb-1">Dias de Teste Restantes</span>
                <span className="text-4xl font-black text-white">{subDetails.trialDaysRemaining}</span>
                <span className="text-xs text-sky-200 block font-medium mt-1">de 60 dias liberados</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card de Assinatura Atual (se possui assinatura) */}
        {isSubscriptionActive && (
          <div className="subscription-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center font-black">
                  <Crown size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      Plano {subDetails?.planName || 'PRO'}
                    </h3>
                    <span className={cn(
                      "text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                      isTrialActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    )}>
                      {isTrialActive ? `Trial (${subDetails?.trialDaysRemaining}d)` : 'Assinatura Ativa'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {isTrialActive ? 'Período de avaliação de 60 dias sem cobrança' : 'Acesso ilimitado ativado'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowUpdateCardModal(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <CreditCard size={14} /> Alterar Cartão
                </button>
                <button
                  onClick={() => setShowPlanChangeModal(true)}
                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-sky-200"
                >
                  <RefreshCw size={14} /> Trocar Plano
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all border border-rose-200"
                >
                  Cancelar Assinatura
                </button>
              </div>
            </div>

            {/* Sub-grid Detalhes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Próxima Cobrança</span>
                <span className="text-base font-extrabold text-slate-900">
                  {subDetails?.nextBillingDate ? new Date(subDetails.nextBillingDate).toLocaleDateString('pt-BR') : '60 dias'}
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Valor: {subDetails?.amount ? subDetails.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 49,99'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Cartão Cadastrado</span>
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <CreditCard size={18} className="text-sky-600" />
                  {subDetails?.cardLast4 ? `${subDetails.cardBrand ? subDetails.cardBrand.toUpperCase() : 'Cartão'} •••• ${subDetails.cardLast4}` : 'Cartão de Crédito'}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {subDetails?.cardExpMonth && subDetails?.cardExpYear ? `Validade: ${String(subDetails.cardExpMonth).padStart(2, '0')}/${subDetails.cardExpYear}` : 'Protegido via Stripe'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Garantia e Suporte</span>
                <div className="flex items-center gap-1.5 text-base font-extrabold text-emerald-700">
                  <ShieldCheck size={18} /> Cancele quando quiser
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Sem multas ou cláusula de fidelidade
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabela / Grid de Planos Disponíveis */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Planos FisioCareHub
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Todos os planos incluem 60 dias de teste grátis no primeiro cadastro.
              </p>
            </div>

            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 underline underline-offset-4"
            >
              <Key size={14} /> Possui uma chave de ativação?
            </button>
          </div>

          {showKeyInput && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleKeyActivation}
              className="subscription-card p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-sm"
            >
              <input
                type="text"
                value={proKey}
                onChange={(e) => setProKey(e.target.value.toUpperCase())}
                placeholder="Insira sua chave (ex: PRO2024)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="subscription-primary-dark w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Ativar Chave'}
              </button>
            </motion.form>
          )}

          {/* Grid de Cards dos Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(PLANS) as PlanKey[]).map((pKey) => {
              const plan = PLANS[pKey];
              const isCurrent = subDetails?.planKey === pKey && isSubscriptionActive;
              const isProMonthly = pKey === 'pro_monthly';

              return (
                <div
                  key={pKey}
                  className={cn(
                    "subscription-card bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between relative shadow-sm hover:shadow-md",
                    isProMonthly ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200",
                    isCurrent && "bg-sky-50/30 border-sky-300"
                  )}
                >
                  {plan.badge && (
                    <span className="subscription-on-color absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    {/* Header do Card */}
                    <div className="mb-4">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{plan.stripePlan.toUpperCase()}</span>
                      <h3 className="text-xl font-black text-slate-900 mt-0.5">{plan.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-snug min-h-[32px]">{plan.description}</p>
                    </div>

                    {/* Preço */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-5">
                      <div className="text-2xl font-black text-slate-900">{plan.formattedAmount}</div>
                      {plan.equivalentMonthlyPrice && (
                        <span className="text-xs font-bold text-sky-700 block mt-0.5">{plan.equivalentMonthlyPrice}</span>
                      )}
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block mt-2">
                        ✦ 60 Dias Grátis Primeiro
                      </span>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2.5 mb-6 text-xs text-slate-600">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-700 leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div>
                    <button
                      onClick={() => {
                        if (isCurrent) return;
                        if (isSubscriptionActive) {
                          handleChangePlan(pKey);
                        } else {
                          setSelectedPlanForSubscribe(pKey);
                        }
                      }}
                      disabled={isCurrent || loading}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm",
                        isCurrent
                          ? "bg-emerald-100 text-emerald-800 cursor-default"
                          : isProMonthly
                          ? "subscription-on-color bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20"
                          : "subscription-primary-dark bg-slate-900 hover:bg-slate-800 text-white"
                      )}
                    >
                      {isCurrent ? (
                        <>
                          <Check size={16} /> Plano Atual
                        </>
                      ) : (
                        <>
                          Ativar 60 Dias Grátis <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs Section */}
        <div className="subscription-card bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <HelpCircle size={20} className="text-sky-600" /> Perguntas Frequentes sobre o Trial de 60 Dias
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Como funciona o período de 60 dias grátis?</h4>
              <p className="leading-relaxed font-medium">
                Ao escolher qualquer plano e cadastrar seu cartão de crédito com o Stripe, seu acesso completo é liberado imediatamente por 60 dias sem qualquer cobrança.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Posso cancelar antes de vencer os 60 dias?</h4>
              <p className="leading-relaxed font-medium">
                Sim! Você pode cancelar a qualquer momento diretamente no app. Se cancelar durante os 60 dias, nenhuma cobrança será efetuada no seu cartão.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Quantas vezes posso usar o Trial?</h4>
              <p className="leading-relaxed font-medium">
                O teste gratuito de 60 dias é permitido apenas 1 vez por usuário. Se cancelar e assinar novamente, a cobrança será iniciada no ato do cadastro.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">O que acontece com meus dados se a assinatura expirar?</h4>
              <p className="leading-relaxed font-medium">
                Seus dados, pacientes, prontuários e históricos permanecem 100% seguros e nunca são excluídos. Ao reativar sua assinatura, tudo fica disponível imediatamente.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Stripe Elements para Assinar */}
      {selectedPlanForSubscribe && profile && (
        <StripeElementsModal
          userId={profile.id}
          userEmail={profile.email || ''}
          userName={profile.nome_completo || ''}
          planKey={selectedPlanForSubscribe}
          mode="subscribe"
          onSuccess={async () => {
            setSelectedPlanForSubscribe(null);
            await refreshProfile();
            await loadDetails();
          }}
          onClose={() => setSelectedPlanForSubscribe(null)}
        />
      )}

      {/* Modal Stripe Elements para Alterar Cartão */}
      {showUpdateCardModal && profile && (
        <StripeElementsModal
          userId={profile.id}
          userEmail={profile.email || ''}
          userName={profile.nome_completo || ''}
          mode="update_card"
          onSuccess={async () => {
            setShowUpdateCardModal(false);
            await refreshProfile();
            await loadDetails();
          }}
          onClose={() => setShowUpdateCardModal(false)}
        />
      )}

      {/* Modal para Trocar Plano */}
      {showPlanChangeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            if (!loading) setShowPlanChangeModal(false);
          }}
        >
          <div
            className="subscription-theme subscription-card bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-white/10 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-10 h-10 bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 rounded-xl flex items-center justify-center">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Trocar Plano</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                      Escolha abaixo o novo plano da sua assinatura.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanChangeModal(false)}
                disabled={loading}
                aria-label="Fechar"
                className="p-2 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(PLANS) as PlanKey[]).map((pKey) => {
                const plan = PLANS[pKey];
                const isCurrentPlan = subDetails?.planKey === pKey;

                return (
                  <div
                    key={pKey}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isCurrentPlan
                        ? "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-700/40"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {plan.stripePlan}
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">{plan.name}</h4>
                      </div>
                      {isCurrentPlan && (
                        <span className="shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40">
                          Atual
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="text-xl font-black text-slate-900 dark:text-white">{plan.formattedAmount}</div>
                      {plan.equivalentMonthlyPrice && (
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300">{plan.equivalentMonthlyPrice}</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-4">
                      {plan.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleChangePlan(pKey)}
                      disabled={isCurrentPlan || loading}
                      className={cn(
                        "w-full py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                        isCurrentPlan
                          ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 cursor-default"
                          : "subscription-on-color bg-sky-600 hover:bg-sky-700 text-white shadow-sm",
                        loading && !isCurrentPlan && "opacity-70 cursor-wait"
                      )}
                    >
                      {isCurrentPlan ? (
                        <>
                          <Check size={15} /> Plano Atual
                        </>
                      ) : loading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Alterando...
                        </>
                      ) : (
                        <>
                          Trocar para este plano <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 p-4 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-sky-700 dark:text-sky-300 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                A troca utiliza sua assinatura existente. Após a confirmação do servidor, os dados do plano são atualizados e a tela é recarregada com o novo acesso.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="subscription-theme subscription-card bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>

            <h3 className="text-xl font-black text-slate-900">Cancelar Assinatura?</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Tem certeza que deseja cancelar? Seu acesso continuará liberado até o final do período atual. Seus dados de pacientes permanecerão completamente seguros.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Manter Assinatura
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="subscription-on-color flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-600/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Bloqueio por Expiração */}
      {isBlocked && (
        <SubscriptionBlockOverlay
          planName={subDetails?.planName || 'PRO'}
          expiredDateStr={subDetails?.trialEnd ? new Date(subDetails.trialEnd).toLocaleDateString('pt-BR') : 'recentemente'}
          onOpenCardUpdate={() => setShowUpdateCardModal(true)}
          onReactivate={handleReactivate}
        />
      )}
    </div>
  );
}
