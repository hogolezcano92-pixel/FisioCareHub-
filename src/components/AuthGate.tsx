import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';
import i18n from '../i18n/config';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, user, profile } = useAuth();
  const [i18nReady, setI18nReady] = React.useState(i18n.isInitialized);

  React.useEffect(() => {
    if (!i18n.isInitialized) {
      const handleInitialized = () => setI18nReady(true);
      i18n.on('initialized', handleInitialized);
      return () => i18n.off('initialized', handleInitialized);
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
