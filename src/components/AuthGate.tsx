import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';
import i18n from '../i18n/config';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, user, profile } = useAuth();
  const [i18nReady, setI18nReady] = React.useState(false);

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

  // If we are still loading the initial auth state OR
  // if we have a user but the profile is still loading OR
  // if translations are not yet ready
  if (loading || (user && !profile) || !i18nReady) {
    return <SplashScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;
