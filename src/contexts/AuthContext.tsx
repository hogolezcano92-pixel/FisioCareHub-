import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import i18n from '../i18n/config';
import { useNavigate } from 'react-router-dom';
import { applyTheme } from '../lib/themes';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  subscription: any | null;
  theme: string;
  language: string;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTheme: (themeId: string) => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache key for local profile storage
const PROFILE_CACHE_KEY = 'fch_profile_cache';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(() => {
    // Optimistic loading from cache
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [subscription, setSubscription] = useState<any | null>(null);
  const [theme, setTheme] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        const p = JSON.parse(cached);
        return p.theme || 'blue';
      }
    } catch {}
    return 'blue';
  });
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('i18nextLng') || 'pt';
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const lastFetchedUserId = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    if (lastFetchedUserId.current === userId && profile && !isInitialMount.current) {
      return { profile, subscription };
    }
    
    try {
      // Use maybeSingle to avoid errors if profile doesn't exist yet
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      let finalProfile = data;

      if (!finalProfile && !error) {
        // Create default profile if missing (e.g. first login)
        const pendingRole = localStorage.getItem('pending_role');
        const finalRole = userMetadata?.role || userMetadata?.tipo_usuario || (pendingRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'paciente');
        
        finalProfile = {
          id: userId,
          nome_completo: userMetadata?.nome_completo || userMetadata?.full_name || 'Usuário',
          email: userMetadata?.email || '',
          avatar_url: userMetadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          tipo_usuario: finalRole,
          plano: finalRole === 'fisioterapeuta' ? 'basic' : 'free',
          plan_type: finalRole === 'fisioterapeuta' ? 'basic' : null,
          status_aprovacao: finalRole === 'paciente' ? 'aprovado' : 'pendente',
          created_at: new Date().toISOString()
        };

        // Try to insert, but don't block if it fails
        supabase.from('perfis').insert(finalProfile).then(({ error: e }) => {
          if (e) console.warn('Silent profile creation failed:', e.message);
        });
      }

      if (finalProfile && finalProfile.email?.toLowerCase() === 'hogolezcano92@gmail.com') {
        // Ensure admin role is persisted in DB if not already
        if (finalProfile.tipo_usuario !== 'admin') {
          supabase.from('perfis')
            .update({ tipo_usuario: 'admin', plano: 'admin' })
            .eq('id', userId)
            .then(({ error: e }) => {
              if (e) console.warn('Automatic admin promotion in DB failed:', e.message);
            });
        }
        finalProfile = { ...finalProfile, tipo_usuario: 'admin', plano: 'admin', plan_type: 'pro' };
      }

      // Fetch subscription in parallel if profile exists
      const subPromise = finalProfile 
        ? supabase.from('assinaturas').select('*').eq('user_id', userId).eq('status', 'ativo').maybeSingle()
        : Promise.resolve({ data: null });

      const { data: subData } = await subPromise;
      
      // Update cache
      if (finalProfile) {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(finalProfile));
      }

      lastFetchedUserId.current = userId;
      return { profile: finalProfile, subscription: subData };
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return { profile: null, subscription: null };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { profile: p, subscription: s } = await fetchProfile(user.id, user.user_metadata);
      setProfile(p);
      setSubscription(s);
    }
  };

  const updateTheme = async (themeId: string) => {
    setTheme(themeId);
    applyTheme(themeId);
    
    // Update profile state to stay in sync
    if (profile) {
      const updatedProfile = { ...profile, theme: themeId };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));
    }

    if (user) {
      try {
        await supabase
          .from('perfis')
          .update({ theme: themeId })
          .eq('id', user.id);
      } catch (err) {
        console.error('Failed to persist theme:', err);
      }
    }
  };

  // Apply theme when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync theme when profile is fetched
  useEffect(() => {
    if (profile?.theme && profile.theme !== theme) {
      setTheme(profile.theme);
    }
    if (profile?.idioma && profile.idioma !== language) {
      setLanguage(profile.idioma);
      i18n.changeLanguage(profile.idioma);
    }
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        if (lastFetchedUserId.current !== currentUser.id) {
          const { profile: p, subscription: s } = await fetchProfile(currentUser.id, currentUser.user_metadata);
          if (mounted) {
            setProfile(p);
            setSubscription(s);
            setLoading(false);
            isInitialMount.current = false;
          }
        } else {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setSubscription(null);
        lastFetchedUserId.current = null;
        localStorage.removeItem(PROFILE_CACHE_KEY);
        setLoading(false);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      authSub.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setSubscription(null);
      localStorage.removeItem(PROFILE_CACHE_KEY);
      navigate('/');
    }
  };

  const updateLanguage = async (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);

    if (profile) {
      const updatedProfile = { ...profile, idioma: lang };
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));
    }

    if (user) {
      try {
        await supabase
          .from('perfis')
          .update({ idioma: lang })
          .eq('id', user.id);
      } catch (err) {
        console.error('Failed to persist language:', err);
      }
    }
  };

  const value = useMemo(() => ({
    user,
    session,
    profile,
    subscription,
    theme,
    language,
    loading,
    signOut,
    refreshProfile,
    updateTheme,
    updateLanguage
  }), [user, session, profile, subscription, theme, language, loading]);

  return (
    <AuthContext.Provider value={value}>
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
