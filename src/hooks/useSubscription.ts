import { useAuth } from '../contexts/AuthContext';
import { getEffectivePlan, hasPlanAccess, type UserPlan } from '../lib/planAccess';

export interface SubscriptionInfo {
  status: 'ativo' | 'cancelado' | 'expirado' | 'pendente' | null;
  expiryDate: string | null;
  loading: boolean;
  userType: 'paciente' | 'fisioterapeuta' | 'admin' | null;
  isPro: boolean;
  isBasic: boolean;
  currentPlan: UserPlan;
}

export function useSubscription() {
  const { profile, subscription, loading } = useAuth();

  const currentPlan = getEffectivePlan(profile, subscription);

  return {
    status: subscription?.status || null,
    expiryDate: subscription?.data_expiracao || null,
    loading,
    userType: profile?.tipo_usuario || null,
    isPro: hasPlanAccess(currentPlan, 'pro'),
    isBasic: hasPlanAccess(currentPlan, 'basic'),
    currentPlan,
  };
}
