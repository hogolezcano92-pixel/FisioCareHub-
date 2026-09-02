import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../i18n/config';
import PostLoginSplash from './PostLoginSplash';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, profileLoading, profileError, user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [i18nReady, setI18nReady] = React.useState(false);
  const [postLoginSplash, setPostLoginSplash] = React.useState<null | {
    target: string;
    role?: string | null;
    name?: string | null;
  }>(null);

  const POST_LOGIN_SPLASH_KEY = 'fch_post_login_splash_pending';

  const normalizeRedirect = (value: string | null | undefined) => {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
    if (value.startsWith('/login')) return '';
    return value;
  };

  const readPostLoginSplashPayload = () => {
    try {
      const raw = sessionStorage.getItem(POST_LOGIN_SPLASH_KEY);
      if (!raw) return null;
      if (raw === '1') return {};
      return JSON.parse(raw) as { target?: string; role?: string | null; name?: string | null };
    } catch {
      return {};
    }
  };

  const clearPostLoginSplashPayload = () => {
    try {
      sessionStorage.removeItem(POST_LOGIN_SPLASH_KEY);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    const checkI18n = () => {
      // Check if initialized AND has the current language translation loaded (or fallback)
      const currentLang = i18n.language;
      const isReady = i18n.isInitialized && (
        i18n.hasResourceBundle(currentLang, 'translation') || 
        i18n.hasResourceBundle(currentLang.split('-')[0], 'translation') ||
        i18n.hasResourceBundle('pt', 'translation')
      );
      
      if (isReady) {
        setI18nReady(true);
        return true;
      }
      return false;
    };

    if (!checkI18n()) {
      const handleReady = () => {
        if (i18n.hasResourceBundle(i18n.language, 'translation')) {
          setI18nReady(true);
        }
      };

      i18n.on('initialized', handleReady);
      i18n.on('loaded', handleReady);
      
      const interval = setInterval(() => {
        if (checkI18n()) {
          clearInterval(interval);
        }
      }, 50);

      return () => {
        i18n.off('initialized', handleReady);
        i18n.off('loaded', handleReady);
        clearInterval(interval);
      };
    }
  }, []);

  React.useEffect(() => {
    if (loading || !i18nReady || !user || !profile || postLoginSplash) return;

    const payload = readPostLoginSplashPayload();
    if (!payload) return;

    const role = payload.role || profile.tipo_usuario || profile.role || 'paciente';
    const isAdmin = role === 'admin' || user.email?.toLowerCase() === 'hogolezcano92@gmail.com';
    const isPhysio = role === 'fisioterapeuta';
    const isApproved = profile.status_aprovacao === 'aprovado' || profile.aprovado === true;

    let target = normalizeRedirect(payload.target) || '/dashboard';

    if (isAdmin && target === '/dashboard') {
      target = '/admin';
    } else if (isPhysio && !isApproved) {
      target = '/aguardando-aprovacao';
    }

    setPostLoginSplash({
      target,
      role,
      name: payload.name || profile.nome_completo || profile.nome || user.user_metadata?.nome_completo || user.user_metadata?.full_name || user.email,
    });
  }, [loading, i18nReady, user, profile, postLoginSplash]);

  const registrationInProgress = location.pathname === '/register' && (() => {
    try {
      return localStorage.getItem('registration_in_progress') === '1';
    } catch {
      return false;
    }
  })();

  // O loader só permanece enquanto existe uma operação real em andamento.
  // Durante o cadastro, o AuthContext propositalmente ignora o perfil básico
  // criado pelo trigger até o Register salvar todos os dados.
  if (loading || (user && profileLoading && !registrationInProgress) || !i18nReady) {
    return <div className="fixed inset-0 z-[90] bg-background" />;
  }

  // Antes, `user && !profile` significava loader eterno. Agora uma falha de
  // leitura vira um estado recuperável, com retry, sem perder a autenticação.
  if (user && !profile && !registrationInProgress) {
    return (
      <div className="fixed inset-0 z-[90] bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl">
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">
            Não foi possível carregar seu perfil
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {profileError || 'Sua sessão foi iniciada, mas os dados do perfil não responderam. Tente novamente.'}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void refreshProfile()}
              className="w-full rounded-2xl bg-sky-500 px-5 py-3 font-black text-white hover:bg-sky-600 transition-colors"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full rounded-2xl bg-slate-100 dark:bg-white/5 px-5 py-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Sair e voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const accountStatus = String(profile?.status_aprovacao || '').trim().toLowerCase();
  const isAccountBlocked = ['suspenso', 'bloqueado', 'excluido'].includes(accountStatus);

  if (user && profile && isAccountBlocked) {
    const title = accountStatus === 'bloqueado'
      ? 'Conta bloqueada'
      : accountStatus === 'excluido'
        ? 'Conta indisponível'
        : 'Conta suspensa';

    return (
      <div className="fixed inset-0 z-[95] bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-rose-500/15 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 text-2xl font-black">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{title}</h2>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mb-6">
            Seu acesso ao FisioCareHub está temporariamente indisponível por uma ação administrativa.
            Entre em contato com o suporte caso precise de esclarecimentos.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-2xl bg-slate-900 dark:bg-white px-5 py-3 font-black text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (postLoginSplash) {
    return (
      <PostLoginSplash
        userRole={postLoginSplash.role}
        userName={postLoginSplash.name}
        duration={6000}
        onComplete={() => {
          const target = postLoginSplash.target || '/dashboard';
          clearPostLoginSplashPayload();
          try {
            sessionStorage.removeItem('pendingRedirect');
          } catch {
            // ignore
          }
          setPostLoginSplash(null);
          navigate(target, { replace: true });
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AuthGate;
