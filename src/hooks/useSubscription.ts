import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getSupabase } from '../supabaseClient';

export interface SubscriptionInfo {
  plan: 'basic' | 'pro';
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  expiryDate: string | null;
  current_period_end: number | null;
  isPro: boolean;
  loading: boolean;
}

export function useSubscription() {
  const [user, authLoading] = useAuthState(auth);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    plan: 'basic',
    status: 'inactive',
    expiryDate: null,
    current_period_end: null,
    isPro: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    // 1. Listen to Firestore for real-time updates
    const unsubFirestore = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const sub = data.subscription || {};
        
        const plan = sub.plan || 'basic';
        const status = sub.status || 'inactive';
        
        setSubscription({
          plan,
          status,
          expiryDate: sub.expiryDate || null,
          current_period_end: sub.current_period_end || null,
          isPro: plan === 'pro' && (status === 'active' || status === 'trialing'),
          loading: false,
        });
      } else {
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    }, (err) => {
      console.error("Error fetching subscription from Firestore:", err);
      setSubscription(prev => ({ ...prev, loading: false }));
    });

    // 2. Optional: Check Supabase if requested (as per user's technical action)
    // "Crie uma verificação de constante isPro baseada na coluna subscription_status do meu banco no Supabase."
    const checkSupabase = async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('subscription_status, plan')
          .eq('id', user.uid)
          .single();

        if (!error && data) {
          // If Supabase has data, we can merge or override
          // For now, let's just log it or use it if Firestore is empty
          console.log("Supabase subscription data:", data);
          if (data.plan === 'pro' || data.subscription_status === 'pro' || data.subscription_status === 'active_pro') {
             setSubscription(prev => ({
               ...prev,
               isPro: true,
               plan: 'pro',
               status: data.subscription_status
             }));
          }
        }
      } catch (err) {
        // Supabase might not have the table yet, ignore errors
        console.warn("Supabase subscription check skipped or failed:", err);
      }
    };

    checkSupabase();

    return () => unsubFirestore();
  }, [user, authLoading]);

  return subscription;
}
