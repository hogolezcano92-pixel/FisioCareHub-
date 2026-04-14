import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  subscription: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const lastFetchedUserId = React.useRef<string | null>(null);

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    if (lastFetchedUserId.current === userId && profile) {
      return { profile, subscription };
    }
    
    try {
      console.log('Fetching profile for:', userId);
      
      // Retry logic to wait for the DB trigger if necessary
      let data = null;
      let error = null;
      let retries = 3;
      
      while (retries > 0) {
        const result = await supabase
          .from('perfis')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
        
        if (data || error) break;
        
        console.log(`Profile not found, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
      
      if (!data && !error) {
        // Profile still not found after retries, create a default one
        console.log('Profile not found after retries, creating for user:', userId);
        
        const pendingRole = localStorage.getItem('pending_role');
        const finalRole = userMetadata?.role || userMetadata?.tipo_usuario || userMetadata?.tipo || userMetadata?.plano || (pendingRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'paciente');
        
        const defaultProfile = {
          id: userId,
          nome_completo: userMetadata?.nome_completo || userMetadata?.full_name || userMetadata?.name || 'Usuário',
          email: userMetadata?.email || '',
          avatar_url: userMetadata?.avatar_url || userMetadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          tipo_usuario: finalRole,
          plano: userMetadata?.plano || (finalRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'free'),
          crefito: userMetadata?.crefito || null,
          especialidade: userMetadata?.especialidade || null,
          telefone: userMetadata?.telefone || null,
          bio: userMetadata?.bio || null,
          localizacao: userMetadata?.localizacao || null,
          endereco: userMetadata?.endereco || null,
          cep: userMetadata?.cep || null,
          pais: userMetadata?.pais || null,
          genero: userMetadata?.genero || null,
          tipo_servico: userMetadata?.tipo_servico || null,
          is_pro: !!userMetadata?.is_pro,
          status_aprovacao: userMetadata?.status_aprovacao || (finalRole === 'paciente' ? 'aprovado' : 'pendente'),
          created_at: new Date().toISOString()
        };

        const { data: newProfile, error: createError } = await supabase
          .from('perfis')
          .insert(defaultProfile)
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile in DB:', createError);
          const { data: retryData } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          if (retryData) return { profile: retryData, subscription: null };
          return { profile: defaultProfile, subscription: null };
        }

        if (pendingRole) localStorage.removeItem('pending_role');
        lastFetchedUserId.current = userId;
        return { profile: newProfile, subscription: null };
      } else if (error) {
        console.error('Error fetching profile:', error);
        // Fallback to metadata-based profile object on error
        const finalRole = userMetadata?.tipo_usuario || 'paciente';
        const fallbackProfile = {
          id: userId,
          nome_completo: userMetadata?.full_name || userMetadata?.name || 'Usuário',
          email: userMetadata?.email || '',
          avatar_url: userMetadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          tipo_usuario: finalRole,
          plano: userMetadata?.plano || (finalRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'free'),
          is_pro: !!userMetadata?.is_pro
        };
        return { profile: fallbackProfile, subscription: null };
      }
      
      lastFetchedUserId.current = userId;
      
      // Fetch subscription
      const { data: subData } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ativo')
        .maybeSingle();
      
      let finalProfile = data;
      if (finalProfile && finalProfile.email?.toLowerCase() === 'hogolezcano92@gmail.com') {
        finalProfile = {
          ...finalProfile,
          tipo_usuario: 'admin',
          plano: 'admin'
        };
      }
      
      return { profile: finalProfile, subscription: subData };
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return { profile: null, subscription: null };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      lastFetchedUserId.current = null; // Force re-fetch
      const { profile: p, subscription: s } = await fetchProfile(user.id, user.user_metadata);
      setProfile(p);
      setSubscription(s);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the primary source of truth.
    // It will trigger with INITIAL_SESSION on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth State Change:', event);
      
      try {
        if (mounted) {
          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
            // Only fetch if user changed or profile is missing
            if (lastFetchedUserId.current !== currentUser.id) {
              const { profile: p, subscription: s } = await fetchProfile(currentUser.id, currentUser.user_metadata);
              if (mounted) {
                setProfile(p);
                setSubscription(s);
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          } else {
            setProfile(null);
            setSubscription(null);
            lastFetchedUserId.current = null;
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error in onAuthStateChange callback:', err);
        if (mounted) setLoading(false);
      }
    });

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timed out, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    try {
      // Don't set loading to true here to avoid immediate flicker/lock
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during signOut:', error);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      // Use navigate instead of window.location.href for better performance
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, subscription, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
