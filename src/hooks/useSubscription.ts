import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionInfo {
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  expiryDate: string | null;
  current_period_end: number | null;
  loading: boolean;
  userType: 'paciente' | 'fisioterapeuta' | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    status: 'active',
    expiryDate: null,
    current_period_end: null,
    loading: false,
    userType: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchUserType = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('perfis')
          .select('tipo_usuario')
          .eq('id', user.id)
          .single();

        if (data && mounted) {
          setSubscription(prev => ({
            ...prev,
            userType: data.tipo_usuario
          }));
        }
      } catch (err) {
        console.error("Error fetching user type:", err);
      }
    };

    fetchUserType();

    return () => {
      mounted = false;
    };
  }, []);

  return subscription;
}
