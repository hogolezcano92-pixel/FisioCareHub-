import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../i18n/config';
import PostLoginSplash from './PostLoginSplash';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, user, profile } = useAuth();
  const navigate = useNavigate();
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

  // If we are still loading the initial auth state OR
  // if we have a user but the profile is still loading OR
  // if translations are not yet ready
  if (loading || (user && !profile) || !i18nReady) {
    return <div className="fixed inset-0 z-[90] bg-background" />;
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
          setPostLoginSplash(null);
          navigate(target, { replace: true });
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AuthGate;
