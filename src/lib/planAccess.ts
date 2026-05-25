export type UserPlan = 'free' | 'basic' | 'pro' | 'admin';

const normalizePlanValue = (value?: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const isActiveSubscription = (subscription?: any | null): boolean => {
  return normalizePlanValue(subscription?.status) === 'ativo';
};

const getSubscriptionPlan = (subscription?: any | null): UserPlan | null => {
  if (!isActiveSubscription(subscription)) return null;

  const rawPlan = normalizePlanValue(
    subscription?.plano ||
    subscription?.plan_type ||
    subscription?.tipo_plano ||
    subscription?.metadata?.plan ||
    subscription?.metadata?.plan_type
  );

  if (rawPlan === 'admin') return 'admin';
  if (rawPlan === 'pro' || rawPlan === 'premium') return 'pro';
  if (rawPlan === 'basic' || rawPlan === 'basico' || rawPlan === 'básico') return 'basic';

  return null;
};

export const getEffectivePlan = (profile?: any | null, subscription?: any | null): UserPlan => {
  const profilePlan = normalizePlanValue(profile?.plan_type || profile?.plano);
  const subscriptionPlan = getSubscriptionPlan(subscription);

  if (profile?.tipo_usuario === 'admin' || profilePlan === 'admin') return 'admin';
  if (subscriptionPlan === 'admin') return 'admin';

  // Mantém compatibilidade com usuários PRO antigos marcados por is_pro.
  if (profile?.is_pro === true) return 'pro';

  // Assinatura ativa só libera o plano que foi comprado.
  // Isso evita o bug: assinatura Basic ativa sendo tratada como PRO.
  if (subscriptionPlan === 'pro') return 'pro';
  if (subscriptionPlan === 'basic') return 'basic';

  if (profilePlan === 'pro' || profilePlan === 'premium') return 'pro';
  if (profilePlan === 'basic' || profilePlan === 'basico' || profilePlan === 'básico') return 'basic';

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
