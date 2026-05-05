import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef
} from 'react';
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
  ready: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTheme: (themeId: string) => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_CACHE_KEY = 'fch_profile_cache';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [theme, setTheme] = useState<string>('blue');
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('i18nextLng') || 'pt';
  });

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const navigate = useNavigate();

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    try {
      const { data } = await supabase
       .from('perfis')
       .select('*')
       .eq('id', userId)
       .maybeSingle();

      let finalProfile = data;

      if (!finalProfile) {
        finalProfile = {
          id: userId,
          nome_completo: userMetadata?.nome_completo || 'Usuário',
          email: userMetadata?.email || '',
          tipo_usuario: 'paciente',
          plano: 'free',
          created_at: new Date().toISOString()
        };
        await supabase.from('perfis').insert(finalProfile);
      }

      const { data: subData } = await supabase
       .from('assinaturas')
       .select('*')
       .eq('user_id', userId)
       .eq('status', 'ativo')
       .maybeSingle();

      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(finalProfile));
      return { profile: finalProfile, subscription: subData };
    } catch {
      return { profile: null, subscription: null };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { profile: p, subscription: s } = await fetchProfile(user.id, user.user_metadata);
    setProfile(p);
    setSubscription(s);
  };

  const updateTheme = async (themeId: string) => {
    setTheme(themeId);
    applyTheme(themeId);
    if (user) {
      await supabase.from('perfis').update({ theme: themeId }).eq('id', user.id);
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription: authSub } } =
      supabase.auth.onAuthStateChange(async (_, currentSession) => {
        if (!mounted) return;

        const currentUser = currentSession?.user?? null;
        setSession(currentSession);
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setSubscription(null);
          localStorage.removeItem(PROFILE_CACHE_KEY);
          setLoading(false);
          setReady(true);
          return;
        }

        const { profile: p, subscription: s } = await fetchProfile(currentUser.id, currentUser.user_metadata);

        if (!mounted) return;

        // CORREÇÃO: aplica tema e idioma ANTES de liberar o app
        if (p?.theme && p.theme!== theme) {
          setTheme(p.theme);
        }
        if (p?.idioma && p.idioma!== i18n.language) {
          await i18n.changeLanguage(p.idioma);
          setLanguage(p.idioma);
          localStorage.setItem('i18nextLng', p.idioma);
        }

        setProfile(p);
        setSubscription(s);
        setLoading(false);
        setReady(true);
      });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription(null);
    localStorage.removeItem(PROFILE_CACHE_KEY);
    navigate('/');
  };

  const updateLanguage = async (lang: string) => {
    setLanguage(lang);
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    if (user) {
      await supabase.from('perfis').update({ idioma: lang }).eq('id', user.id);
    }
  };

  const value = useMemo(
    () => ({
      user, session, profile, subscription, theme, language, loading, ready,
      signOut, refreshProfile, updateTheme, updateLanguage
    }),
    [user, session, profile, subscription, theme, language, loading, ready]
  );

  // CORREÇÃO: só renderiza filhos depois de ready
  return <AuthContext.Provider value={value}>{ready? children : null}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
