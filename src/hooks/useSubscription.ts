import { useAuth } from '../contexts/AuthContext';

export interface SubscriptionInfo {
  status: 'ativo' | 'cancelado' | 'expirado' | 'pendente' | null;
  expiryDate: string | null;
  loading: boolean;
  userType: 'paciente' | 'fisioterapeuta' | 'admin' | null;
  isPro: boolean;
}

export function useSubscription() {
  const { profile, subscription, loading } = useAuth();

  return {
    status: subscription?.status || null,
    expiryDate: subscription?.data_expiracao || null,
    loading,
    userType: profile?.tipo_usuario || null,
    isPro: profile?.plano === 'free' || profile?.plano === 'admin' || subscription?.status === 'ativo',
  };
}
