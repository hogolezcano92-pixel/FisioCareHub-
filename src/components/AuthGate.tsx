import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, user, profile } = useAuth();

  // If we are still loading the initial auth state OR
  // if we have a user but the profile (which contains essential role/settings) is still loading
  if (loading || (user && !profile)) {
    return <SplashScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;
