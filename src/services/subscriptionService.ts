/**
 * FisioCareHub - Subscription & 60-Day Trial Service
 */

import { supabase } from '../lib/supabase';

export type PlanKey = 'basic_monthly' | 'pro_monthly' | 'pro_semester' | 'pro_yearly';

export interface PlanInfo {
  id: PlanKey;
  name: string;
  stripePlan: 'basic' | 'pro';
  billingCycle: 'monthly' | 'semester' | 'yearly';
  amount: number;
  formattedAmount: string;
  equivalentMonthlyPrice?: string;
  badge?: string;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanKey, PlanInfo> = {
  basic_monthly: {
    id: 'basic_monthly',
    name: 'Basic Mensal',
    stripePlan: 'basic',
    billingCycle: 'monthly',
    amount: 19.99,
    formattedAmount: 'R$ 19,99',
    description: 'Ideal para quem está começando e precisa gerenciar pacientes e prontuários internamente.',
    features: [
      '60 Dias Grátis de Teste',
      'Cadastro e Gestão de Pacientes',
      'Histórico de Evoluções e Anamnese',
      'Gestão de Documentos Básicos',
      'Agendamentos Internos Básicos'
    ]
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'PRO Mensal',
    stripePlan: 'pro',
    billingCycle: 'monthly',
    amount: 49.99,
    formattedAmount: 'R$ 49,99',
    badge: 'Mais Completo',
    description: 'Acesso total para profissionais que buscam captar pacientes e usar IA avançada sem longo compromisso.',
    features: [
      '60 Dias Grátis de Teste',
      'Captação de Pacientes Liberada',
      'Perfil Destacado no Marketplace',
      'Pacientes Ilimitados',
      'Inteligência Artificial Completa',
      'Relatórios e Gráficos de Desempenho',
      'Exportação de Prontuários em PDF'
    ]
  },
  pro_semester: {
    id: 'pro_semester',
    name: 'PRO Semestral',
    stripePlan: 'pro',
    billingCycle: 'semester',
    amount: 269.90,
    formattedAmount: 'R$ 269,90',
    equivalentMonthlyPrice: 'R$ 44,98/mês',
    badge: 'Economize 10%',
    description: 'Todos os benefícios do plano PRO por 6 meses com economia exclusiva.',
    features: [
      '60 Dias Grátis de Teste',
      'Captação de Pacientes Liberada',
      'Perfil Destacado no Marketplace',
      'Pacientes Ilimitados',
      'Inteligência Artificial Completa',
      'Economia de R$ 30,04 no semestre'
    ]
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'PRO Anual',
    stripePlan: 'pro',
    billingCycle: 'yearly',
    amount: 499.90,
    formattedAmount: 'R$ 499,90',
    equivalentMonthlyPrice: 'R$ 41,66/mês',
    badge: 'Maior Economia (20% OFF)',
    description: 'O melhor custo-benefício para fisioterapeutas que buscam crescimento continuo.',
    features: [
      '60 Dias Grátis de Teste',
      'Captação de Pacientes Liberada',
      'Perfil Destacado no Marketplace',
      'Pacientes Ilimitados',
      'Inteligência Artificial Completa',
      'Economia de R$ 99,98 no ano'
    ]
  }
};

export interface SubscriptionDetails {
  plan: 'free' | 'basic' | 'pro';
  planKey: PlanKey | string;
  planName: string;
  status: 'free' | 'trialing' | 'ativo' | 'active' | 'past_due' | 'expirado' | 'cancelado';
  isTrial: boolean;
  trialDaysRemaining: number;
  trialStart: string | null;
  trialEnd: string | null;
  trialUtilizado: boolean;
  nextBillingDate: string | null;
  lastBillingDate: string | null;
  amount: number;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export const calculateTrialDaysRemaining = (trialEndDate: string | Date | null | undefined): number => {
  if (!trialEndDate) return 0;
  const end = new Date(trialEndDate).getTime();
  const now = Date.now();
  if (isNaN(end) || end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

export const getStripeConfig = async () => {
  try {
    const res = await fetch('/api/stripe/config');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[SubscriptionService] Config fetch failed:', err);
  }
  return {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  };
};

export const createSetupIntent = async (userId: string, email: string) => {
  const res = await fetch('/api/stripe/create-setup-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao inicializar formulário de pagamento.');
  }

  return await res.json();
};

export const createSubscriptionWithPaymentMethod = async (params: {
  userId: string;
  email: string;
  userName?: string;
  planKey: PlanKey;
  paymentMethodId: string;
}) => {
  const res = await fetch('/api/stripe/create-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao criar assinatura com o Stripe.');
  }

  return await res.json();
};

export const updateSubscriptionPaymentMethod = async (params: {
  userId: string;
  paymentMethodId: string;
}) => {
  const res = await fetch('/api/stripe/update-payment-method', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao atualizar cartão no Stripe.');
  }

  return await res.json();
};

export const changeSubscriptionPlan = async (params: {
  userId: string;
  newPlanKey: PlanKey;
}) => {
  const res = await fetch('/api/stripe/change-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao alterar plano de assinatura.');
  }

  return await res.json();
};

export const cancelSubscription = async (userId: string) => {
  const res = await fetch('/api/stripe/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao cancelar assinatura.');
  }

  return await res.json();
};

export const reactivateSubscription = async (userId: string) => {
  const res = await fetch('/api/stripe/reactivate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao reativar assinatura.');
  }

  return await res.json();
};

export const fetchSubscriptionDetails = async (userId: string): Promise<SubscriptionDetails | null> => {
  try {
    const res = await fetch(`/api/stripe/subscription-details?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[SubscriptionService] Server fetch failed, falling back to Supabase direct query:', e);
  }

  // Fallback to Supabase direct fetch
  try {
    const { data: profile } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: subs } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('user_id', userId)
      .order('data_inicio', { ascending: false })
      .limit(1);

    const sub = Array.isArray(subs) ? subs[0] : null;

    if (!profile && !sub) return null;

    const rawStatus = (sub?.status || profile?.subscription_status || 'free').toLowerCase();
    const trialEnd = sub?.trial_end || profile?.trial_end || null;
    const daysRemaining = calculateTrialDaysRemaining(trialEnd);
    const isTrial = rawStatus === 'trialing' || (daysRemaining > 0 && rawStatus !== 'expirado' && rawStatus !== 'cancelado');

    const planType = (sub?.plano || profile?.plan_type || profile?.plano || 'free').toLowerCase();

    return {
      plan: planType as any,
      planKey: (sub?.plan_key || `${planType}_monthly`) as any,
      planName: planType === 'pro' ? 'PRO' : planType === 'basic' ? 'Basic' : 'Gratuito',
      status: rawStatus as any,
      isTrial,
      trialDaysRemaining: daysRemaining,
      trialStart: sub?.trial_start || profile?.trial_start || null,
      trialEnd,
      trialUtilizado: Boolean(profile?.trial_utilizado || sub?.trial_utilizado),
      nextBillingDate: sub?.next_billing_date || profile?.next_billing_date || sub?.data_expiracao || null,
      lastBillingDate: sub?.last_billing_date || profile?.last_billing_date || null,
      amount: sub?.valor || (planType === 'pro' ? 49.99 : planType === 'basic' ? 19.99 : 0),
      cardBrand: sub?.card_brand || profile?.card_brand || null,
      cardLast4: sub?.card_last4 || profile?.card_last4 || null,
      cardExpMonth: sub?.card_exp_month || profile?.card_exp_month || null,
      cardExpYear: sub?.card_exp_year || profile?.card_exp_year || null,
      stripeCustomerId: sub?.stripe_customer_id || profile?.stripe_customer_id || null,
      stripeSubscriptionId: sub?.stripe_subscription_id || profile?.stripe_subscription_id || null,
    };
  } catch (err) {
    console.error('[SubscriptionService] Direct Supabase fetch failed:', err);
    return null;
  }
};
