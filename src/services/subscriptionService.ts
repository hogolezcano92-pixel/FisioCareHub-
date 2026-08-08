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

const getStripeApiHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const getStripeConfig = async () => {
  try {
    const res = await fetch('/api/stripe/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.publishableKey) {
        return data;
      }
    } else {
      console.warn(`[SubscriptionService] Config fetch returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('[SubscriptionService] Config fetch failed, using environment fallback:', err);
  }
  return {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  };
};

export const createSetupIntent = async (userId: string, email: string, userName?: string) => {
  try {
    const res = await fetch('/api/stripe/create-setup-intent', {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify({ userId, email, userName })
    });

    if (!res.ok) {
      let errMessage = 'Erro ao inicializar formulário de pagamento.';
      try {
        const err = await res.json();
        errMessage = err.error || errMessage;
      } catch (_) {}
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[SubscriptionService] createSetupIntent error:', err);
    throw new Error(err.message || 'Falha de conexão com o servidor de pagamento.');
  }
};

export const createSubscriptionWithPaymentMethod = async (params: {
  userId: string;
  email: string;
  userName?: string;
  planKey: PlanKey;
  paymentMethodId: string;
}) => {
  const url = '/api/stripe/create-subscription';
  console.log('[SubscriptionService Log] Enviando requisição de assinatura:', {
    url,
    payload: params
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify(params)
    });

    console.log('[SubscriptionService Log] Resposta HTTP recebida:', {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      data = { rawText: responseText };
    }

    console.log('[SubscriptionService Log] Corpo completo da resposta:', data);

    if (!res.ok || data.success === false) {
      const stepStr = data.step ? `[Passo: ${data.step}] ` : '';
      const errMessage = data.message || data.error || 'Erro ao criar assinatura com o Stripe.';
      const stripeErrStr = data.stripeError ? ` (Stripe: ${data.stripeError})` : '';
      const fullError = `${stepStr}${errMessage}${stripeErrStr}`;

      console.error('[SubscriptionService Error] Servidor retornou falha:', {
        status: res.status,
        data,
        fullError
      });

      const errObj = new Error(fullError);
      (errObj as any).serverDetails = data;
      throw errObj;
    }

    return data;
  } catch (err: any) {
    console.error('[SubscriptionService Error] Exceção em createSubscriptionWithPaymentMethod:', {
      message: err.message,
      stack: err.stack,
      serverDetails: err.serverDetails || null
    });
    throw err;
  }
};

export const updateSubscriptionPaymentMethod = async (params: {
  userId: string;
  paymentMethodId: string;
}) => {
  const url = '/api/stripe/update-payment-method';
  console.log('[SubscriptionService Log] Enviando requisição de atualização de cartão:', {
    url,
    payload: params
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify(params)
    });

    console.log('[SubscriptionService Log] Resposta HTTP recebida (update-payment-method):', {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      data = { rawText: responseText };
    }

    console.log('[SubscriptionService Log] Corpo completo da resposta (update-payment-method):', data);

    if (!res.ok || data.success === false) {
      let errMessage = data.message || data.error || 'Erro ao atualizar cartão no Stripe.';
      const errObj = new Error(errMessage);
      (errObj as any).serverDetails = data;
      throw errObj;
    }

    return data;
  } catch (err: any) {
    console.error('[SubscriptionService Error] Exceção em updateSubscriptionPaymentMethod:', {
      message: err.message,
      stack: err.stack,
      serverDetails: err.serverDetails || null
    });
    throw err;
  }
};

export const changeSubscriptionPlan = async (params: {
  userId: string;
  newPlanKey: PlanKey;
}) => {
  try {
    const res = await fetch('/api/stripe/change-plan', {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      let errMessage = 'Erro ao alterar plano de assinatura.';
      try {
        const err = await res.json();
        errMessage = err.error || errMessage;
      } catch (_) {}
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[SubscriptionService] changePlan error:', err);
    throw new Error(err.message || 'Falha ao alterar plano no servidor.');
  }
};

export const cancelSubscription = async (userId: string) => {
  try {
    const res = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      let errMessage = 'Erro ao cancelar assinatura.';
      try {
        const err = await res.json();
        errMessage = err.error || errMessage;
      } catch (_) {}
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[SubscriptionService] cancelSubscription error:', err);
    throw new Error(err.message || 'Falha ao cancelar assinatura no servidor.');
  }
};

export const reactivateSubscription = async (userId: string) => {
  try {
    const res = await fetch('/api/stripe/reactivate-subscription', {
      method: 'POST',
      headers: await getStripeApiHeaders(),
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      let errMessage = 'Erro ao reativar assinatura.';
      try {
        const err = await res.json();
        errMessage = err.error || errMessage;
      } catch (_) {}
      throw new Error(errMessage);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[SubscriptionService] reactivateSubscription error:', err);
    throw new Error(err.message || 'Falha ao reativar assinatura no servidor.');
  }
};

export const fetchSubscriptionDetails = async (userId: string): Promise<SubscriptionDetails | null> => {
  try {
    const res = await fetch(`/api/stripe/subscription-details?userId=${encodeURIComponent(userId)}`, { headers: await getStripeApiHeaders() });
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
