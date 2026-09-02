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
  profileLoading: boolean;
  profileError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: (explicitUser?: User | null) => Promise<void>;
  updateTheme: (themeId: string) => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache key for local profile storage
const PROFILE_CACHE_KEY = 'fch_profile_cache';
const AUTH_QUERY_TIMEOUT_MS = 10000;

function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} excedeu ${Math.round(timeoutMs / 1000)} segundos.`));
    }, timeoutMs);

    Promise.resolve(operation).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const navigate = useNavigate();

  const lastFetchedUserId = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const lastSubscriptionReconcileKey = useRef<string | null>(null);

  // Helper to handle fatal authentication errors (corrupted sessions, invalid refresh tokens)
  const handleFatalAuthError = async (message: string) => {
    console.error(`[Auth] Fatal session error detected: ${message}`);
    
    // Clear React state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    setSubscription(null);
    setProfileLoading(false);
    setProfileError(null);
    lastFetchedUserId.current = null;
    
    // Clear all storage related to authentication
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      console.error('[Auth] Error clearing storage:', e);
    }

    // Attempt to notify Supabase and others of signout with global scope
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      // Ignore errors here as we are likely already unauthenticated
    }

    // Ensure we are on login page
    navigate('/login', { replace: true });
    setLoading(false);
  };

  const fetchProfile = async (userId: string, userMetadata?: any, forceRefresh = false) => {
    if (!forceRefresh && lastFetchedUserId.current === userId && profile && !isInitialMount.current) {
      return { profile, subscription };
    }

    const registrationInProgress = localStorage.getItem('registration_in_progress') === '1';

    // Durante o cadastro, o trigger do Supabase pode criar um perfil básico
    // imediatamente após o signUp. Não devemos ler/cachear esse perfil básico,
    // senão o app acha que o cadastro está incompleto mesmo depois do Register
    // salvar o payload completo. O Register força a leitura final após o upsert.
    if (registrationInProgress && !forceRefresh) {
      return { profile: null, subscription: null };
    }
    
    try {
      // Use maybeSingle to avoid errors if profile doesn't exist yet
      const { data, error } = await withTimeout(
        supabase
          .from('perfis')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        AUTH_QUERY_TIMEOUT_MS,
        'Carregamento do perfil'
      );

      if (error) {
        throw error;
      }
      
      let finalProfile = data;

      if (!finalProfile && !error) {
        // Create default profile if missing (e.g. first login)
        const pendingRole = localStorage.getItem('pending_role');
        const finalRole = userMetadata?.role || userMetadata?.tipo_usuario || (pendingRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'paciente');
        
        finalProfile = {
          id: userId,
          nome_completo: userMetadata?.nome_completo || userMetadata?.full_name || 'Usuário',
          email: userMetadata?.email || '',
          telefone: null,
          cpf: null,
          cpf_cnpj: null,
          data_nascimento: null,
          bio: '',
          avatar_url: userMetadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          foto_url: userMetadata?.avatar_url || null,
          tipo_usuario: finalRole,
          role: finalRole,
          plano: 'free',
          plan_type: 'free',
          is_pro: false,
          aprovado: finalRole === 'paciente',
          status_aprovacao: finalRole === 'paciente' ? 'aprovado' : 'pendente',
          plan_intro_seen: false,
          welcome_seen: false,
          theme: 'blue',
          idioma: localStorage.getItem('i18nextLng') || 'pt',
          cidade: null,
          estado: null,
          endereco: null,
          cep: null,
          pais: 'Brasil',
          localizacao: null,
          genero: null,
          crefito: null,
          especialidade: null,
          tipo_servico: finalRole === 'fisioterapeuta' ? 'ambos' : null,
          preco_sessao: null,
          experiencia_profissional: null,
          observacoes_saude: null,
          documentos: JSON.stringify([]),
          formacao_academica: [],
          servicos_ofertados: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

      // O stripe_subscription_id salvo no perfil é a referência autoritativa
      // da assinatura atual. Buscar apenas "a linha ativa mais recente" pode
      // selecionar um trial/contrato antigo e fazer o plano anterior prevalecer
      // sobre o perfil recém-sincronizado pelo backend.
      const loadCurrentSubscription = async () => {
        if (!finalProfile) return { data: [], error: null };

        const currentStripeSubscriptionId = finalProfile.stripe_subscription_id;
        if (currentStripeSubscriptionId) {
          const exactResult = await supabase
            .from('assinaturas')
            .select('*')
            .eq('user_id', userId)
            .eq('stripe_subscription_id', currentStripeSubscriptionId)
            .limit(1);

          if (!exactResult.error && exactResult.data?.length) {
            return exactResult;
          }

          if (exactResult.error) {
            console.warn('[Auth] Não foi possível carregar a assinatura Stripe indicada pelo perfil:', exactResult.error.message);
          }
        }

        // Compatibilidade com assinaturas manuais/legadas que ainda não têm
        // stripe_subscription_id. Esse fallback só é usado quando não existe
        // uma linha correspondente à referência atual do perfil.
        return supabase
          .from('assinaturas')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['ativo', 'active', 'trialing', 'trial'])
          .order('data_inicio', { ascending: false })
          .limit(1);
      };

      let subRows: any[] | null = [];
      try {
        const subResult = await withTimeout(
          loadCurrentSubscription(),
          AUTH_QUERY_TIMEOUT_MS,
          'Carregamento da assinatura'
        );
        subRows = (subResult as any)?.data ?? [];
        if ((subResult as any)?.error) {
          console.warn('[Auth] Não foi possível carregar a assinatura:', (subResult as any).error.message);
        }
      } catch (subscriptionError) {
        // A assinatura não deve impedir o login. O perfil continua sendo
        // carregado e uma atualização posterior pode reconciliar o plano.
        console.warn('[Auth] Timeout/erro ao carregar assinatura:', subscriptionError);
        subRows = [];
      }
      const subData = Array.isArray(subRows) ? subRows[0] || null : null;
      
      // Update cache
      if (finalProfile) {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(finalProfile));
      }

      lastFetchedUserId.current = userId;
      return { profile: finalProfile, subscription: subData, error: null };
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return {
        profile: null,
        subscription: null,
        error: error instanceof Error ? error.message : 'Não foi possível carregar o perfil.'
      };
    }
  };

  const refreshProfile = async (explicitUser?: User | null) => {
    // Evitamos chamar auth.getSession() dentro do refresh do perfil. Logo após
    // SIGNED_IN essa chamada concorria com o lock interno do Supabase Auth e
    // podia deixar o login pendurado indefinidamente.
    const activeUser = explicitUser || user || session?.user || null;

    if (activeUser) {
      setProfileLoading(true);
      setProfileError(null);
      try {
        // Force a fresh Supabase read after profile edits/register. Without this, the local
        // profile cache can make fields like bio/observacoes_saude appear unsaved.
        const { profile: p, subscription: s, error } = await fetchProfile(activeUser.id, activeUser.user_metadata, true);
        setProfile(p);
        setSubscription(s);
        setProfileError(p ? null : (error || 'Não foi possível carregar seu perfil.'));
        if (p) {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
        }
      } finally {
        setProfileLoading(false);
      }
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
    let authSubscription: { unsubscribe: () => void } | null = null;

    const loadProfileForUser = async (currentUser: User, forceRefresh = false) => {
      if (!mounted) return;

      setProfileLoading(true);
      setProfileError(null);

      try {
        const { profile: p, subscription: s, error } = await fetchProfile(
          currentUser.id,
          currentUser.user_metadata,
          forceRefresh
        );

        if (!mounted) return;

        setProfile(p);
        setSubscription(s);

        const registrationInProgress = localStorage.getItem('registration_in_progress') === '1';
        if (!p && !registrationInProgress) {
          setProfileError(error || 'Não foi possível carregar seu perfil.');
        } else {
          setProfileError(null);
        }
      } catch (error) {
        console.error('[Auth] Falha ao carregar perfil:', error);
        if (mounted) {
          setProfileError(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
          isInitialMount.current = false;
        }
      }
    };

    // O callback permanece síncrono. Qualquer consulta ao Supabase é adiada
    // para depois do retorno do callback para não disputar o lock do Auth.
    const handleAuthStateChange = (event: string, currentSession: Session | null) => {
      if (!mounted) return;

      console.log(`[Auth] Event: ${event}`);

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        if (lastFetchedUserId.current !== currentUser.id) {
          window.setTimeout(() => {
            if (mounted) void loadProfileForUser(currentUser);
          }, 0);
        }
      } else {
        setProfile(null);
        setSubscription(null);
        setProfileLoading(false);
        setProfileError(null);
        lastFetchedUserId.current = null;
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
    };

    const initializeAuth = async () => {
      try {
        // Primeiro resolvemos a sessão inicial. Só depois registramos o listener,
        // evitando duas leituras concorrentes de sessão/perfil na montagem.
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_QUERY_TIMEOUT_MS,
          'Validação da sessão'
        );

        if (!mounted) return;

        if (error) {
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid refresh token')) {
            await handleFatalAuthError(error.message);
            return;
          }
          console.error('[Auth] Erro ao validar sessão inicial:', error);
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
          await loadProfileForUser(data.session.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setProfileLoading(false);
          setProfileError(null);
          setLoading(false);
        }
      } catch (error) {
        if (!mounted) return;
        console.error('[Auth] Falha/timeout ao validar sessão inicial:', error);
        setLoading(false);
        setProfileLoading(false);
        setProfileError(error instanceof Error ? error.message : 'Não foi possível validar sua sessão.');
      } finally {
        if (!mounted) return;

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        authSubscription = authSub;
      }
    };

    void initializeAuth();

    // Última proteção: nunca deixar o aplicativo preso no loader global.
    const safetyTimeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, AUTH_QUERY_TIMEOUT_MS + 2000);

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
      window.clearTimeout(safetyTimeout);
    };
  }, []);

  // Mantém decisões administrativas de acesso sincronizadas durante a sessão.
  // Realtime entrega a mudança imediatamente; foco/visibilidade e um polling leve
  // funcionam como fallback caso o Realtime esteja temporariamente indisponível.
  useEffect(() => {
    if (!user?.id) return;

    let disposed = false;
    let refreshing = false;

    const refreshAdministrativeState = async () => {
      if (disposed || refreshing) return;
      refreshing = true;
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data || disposed) return;

        setProfile(data);
        try {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        } catch {}
      } catch (error) {
        console.warn('[Auth] Não foi possível atualizar silenciosamente o estado administrativo do perfil:', error);
      } finally {
        refreshing = false;
      }
    };

    const channel = supabase
      .channel(`profile-admin-watch:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'perfis', filter: `id=eq.${user.id}` },
        (payload) => {
          const nextProfile = payload.new as any;
          if (!nextProfile || disposed) return;

          setProfile(nextProfile);
          try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile));
          } catch {}
        }
      )
      .subscribe();

    const handleFocus = () => void refreshAdministrativeState();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshAdministrativeState();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    const intervalId = window.setInterval(() => void refreshAdministrativeState(), 60_000);

    return () => {
      disposed = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Recuperação automática de acesso: se o Supabase local estiver marcado como
  // Free/cancelado, mas o perfil ainda tiver uma assinatura Stripe vinculada,
  // consulta o backend uma única vez. O endpoint compara com o Stripe e repara
  // perfis afetados por webhooks atrasados sem exigir nova assinatura/cartão.
  useEffect(() => {
    if (!user) {
      lastSubscriptionReconcileKey.current = null;
      return;
    }

    const profileStripeSubscriptionId = String(profile?.stripe_subscription_id || '').trim();
    const rowStripeSubscriptionId = String(subscription?.stripe_subscription_id || '').trim();
    const rowMatchesCurrentProfile = !profileStripeSubscriptionId || !rowStripeSubscriptionId || profileStripeSubscriptionId === rowStripeSubscriptionId;
    const stripeSubscriptionId = profileStripeSubscriptionId || (rowMatchesCurrentProfile ? rowStripeSubscriptionId : '') || null;
    const localStatus = String(
      (rowMatchesCurrentProfile ? subscription?.status : null) || profile?.subscription_status || ''
    ).trim().toLowerCase();
    const localHasAccess = ['ativo', 'active', 'trialing', 'trial'].includes(localStatus);
    const accessToken = session?.access_token;

    if (!profile || !stripeSubscriptionId || !accessToken || localHasAccess) return;

    const reconcileKey = `${user.id}:${stripeSubscriptionId}:${localStatus || 'unknown'}`;
    if (lastSubscriptionReconcileKey.current === reconcileKey) return;
    lastSubscriptionReconcileKey.current = reconcileKey;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AUTH_QUERY_TIMEOUT_MS + 2000);
    let disposed = false;

    void fetch(`/api/stripe/subscription-details?userId=${encodeURIComponent(user.id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then(async (details) => {
        if (disposed || !details) return;
        const serverStatus = String(details.status || '').trim().toLowerCase();
        if (['ativo', 'active', 'trialing', 'trial'].includes(serverStatus)) {
          console.info('[Auth] Assinatura válida recuperada do Stripe. Atualizando acesso local.');
          await refreshProfile(user);
        }
      })
      .catch((error) => {
        if ((error as any)?.name !== 'AbortError') {
          console.warn('[Auth] Reconciliação automática da assinatura não concluída:', error);
        }
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    user?.id,
    session?.access_token,
    profile?.stripe_subscription_id,
    profile?.subscription_status,
    subscription?.stripe_subscription_id,
    subscription?.status,
  ]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setProfileLoading(false);
      setProfileError(null);
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
    profileLoading,
    profileError,
    signOut,
    refreshProfile,
    updateTheme,
    updateLanguage
  }), [user, session, profile, subscription, theme, language, loading, profileLoading, profileError]);

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
