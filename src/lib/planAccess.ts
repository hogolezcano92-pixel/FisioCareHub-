export type UserPlan = 'free' | 'basic' | 'pro' | 'admin';

const normalizePlanValue = (value?: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const isActiveSubscription = (subscription?: any | null, profile?: any | null): boolean => {
  const subStatus = normalizePlanValue(subscription?.status);
  const profileStatus = normalizePlanValue(profile?.subscription_status);
  const status = subStatus || profileStatus;

  // Statuses that grant active access
  if (['ativo', 'active', 'trialing', 'trial'].includes(status)) {
    return true;
  }

  // If trial_end exists and is in the future, allow access
  const trialEnd = subscription?.trial_end || profile?.trial_end;
  if (trialEnd) {
    const endTime = new Date(trialEnd).getTime();
    if (!isNaN(endTime) && endTime > Date.now() && !['expirado', 'cancelado', 'canceled', 'bloqueado', 'past_due'].includes(status)) {
      return true;
    }
  }

  return false;
};

const getSubscriptionPlan = (subscription?: any | null, profile?: any | null): UserPlan | null => {
  if (!isActiveSubscription(subscription, profile)) return null;

  const rawPlan = normalizePlanValue(
    subscription?.plano ||
    subscription?.plan_type ||
    subscription?.tipo_plano ||
    profile?.plan_type ||
    profile?.plano
  );

  if (rawPlan === 'admin') return 'admin';
  if (rawPlan === 'pro' || rawPlan === 'premium') return 'pro';
  if (rawPlan === 'basic' || rawPlan === 'basico' || rawPlan === 'básico') return 'basic';

  return null;
};

export const getEffectivePlan = (profile?: any | null, subscription?: any | null): UserPlan => {
  if (profile?.tipo_usuario === 'admin') return 'admin';

  const subStatus = normalizePlanValue(subscription?.status);
  const profileStatus = normalizePlanValue(profile?.subscription_status);

  // Explicitly check for blocked/expired/canceled state
  const isBlockedOrExpired = ['expirado', 'past_due', 'cancelado', 'canceled', 'bloqueado'].includes(subStatus) ||
                             ['expirado', 'past_due', 'cancelado', 'canceled', 'bloqueado'].includes(profileStatus);

  // Check if trial has expired
  const trialEnd = subscription?.trial_end || profile?.trial_end;
  const isTrialExpired = trialEnd ? new Date(trialEnd).getTime() <= Date.now() : false;

  if (isBlockedOrExpired || (isTrialExpired && !['ativo', 'active'].includes(subStatus) && !['ativo', 'active'].includes(profileStatus))) {
    return 'free';
  }

  const activePlan = getSubscriptionPlan(subscription, profile);
  if (activePlan) return activePlan;

  // Compatibility for legacy marked PRO users without explicit cancellation
  if (profile?.is_pro === true && !isBlockedOrExpired) return 'pro';

  return 'free';
};

export const hasPlanAccess = (currentPlan: UserPlan, requiredPlan: UserPlan = 'free'): boolean => {
  const planRank: Record<UserPlan, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    admin: 3,
  };

  return planRank[currentPlan] >= planRank[requiredPlan];
};

export const getPatientLimitByPlan = (plan: UserPlan): number | null => {
  if (plan === 'free') return 3;
  // Basic é pago e deve servir para organização interna sem travar o uso.
  if (plan === 'basic' || plan === 'pro' || plan === 'admin') return null;
  return 3;
};

export const getPlanLabel = (plan: UserPlan): string => {
  if (plan === 'admin') return 'Admin';
  if (plan === 'pro') return 'PRO';
  if (plan === 'basic') return 'Basic';
  return 'Gratuito';
};


export const FREE_DOCUMENT_MONTHLY_LIMIT = 3;

const FREE_DOCUMENT_TEMPLATE_IDS = new Set(['atestado', 'autorizacao', 'laudo']);

export const isFreeDocumentTemplate = (templateId?: string | null): boolean => {
  // Documento geral sem modelo específico continua liberado para teste,
  // mas respeita o limite mensal do plano gratuito.
  if (!templateId) return true;
  return FREE_DOCUMENT_TEMPLATE_IDS.has(String(templateId).trim().toLowerCase());
};

export const getDocumentLimitByPlan = (plan: UserPlan): number | null => {
  if (plan === 'free') return FREE_DOCUMENT_MONTHLY_LIMIT;
  return null;
};
