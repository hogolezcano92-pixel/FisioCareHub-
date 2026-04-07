import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const lastFetchedUserId = React.useRef<string | null>(null);

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    if (lastFetchedUserId.current === userId && profile) {
      return profile;
    }
    
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Profile not found, create a default one (likely OAuth user)
        console.log('Profile not found, creating default for user:', userId);
        
        // Check if there's a pending role from Register page (for OAuth)
        const pendingRole = localStorage.getItem('pending_role');
        const finalRole = userMetadata?.tipo || userMetadata?.tipo_usuario || (pendingRole === 'fisioterapeuta' ? 'fisioterapeuta' : 'paciente');
        
        // Clear the pending role after use
        if (pendingRole) localStorage.removeItem('pending_role');

        const { data: newProfile, error: createError } = await supabase
          .from('perfis')
          .insert({
            id: userId,
            nome: userMetadata?.full_name || userMetadata?.name || 'Usuário',
            nome_completo: userMetadata?.full_name || userMetadata?.name || 'Usuário',
            email: userMetadata?.email || '',
            foto_url: userMetadata?.avatar_url || userMetadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            avatar_url: userMetadata?.avatar_url || userMetadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            tipo: finalRole,
            tipo_usuario: finalRole,
            crefito: userMetadata?.crefito || null,
            especialidade: userMetadata?.especialidade || null,
            is_pro: !!userMetadata?.is_pro,
            aprovado: finalRole === 'paciente',
            status_aprovacao: finalRole === 'paciente' ? 'aprovado' : 'pendente'
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating default profile:', createError);
          return null;
        }
        lastFetchedUserId.current = userId;
        return newProfile;
      } else if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      lastFetchedUserId.current = userId;
      return data;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      lastFetchedUserId.current = null; // Force re-fetch
      const p = await fetchProfile(user.id, user.user_metadata);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the primary source of truth.
    // It will trigger with INITIAL_SESSION on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth State Change:', event);
      
      if (mounted) {
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Only fetch if user changed or profile is missing
          if (lastFetchedUserId.current !== currentUser.id) {
            const p = await fetchProfile(currentUser.id, currentUser.user_metadata);
            if (mounted) {
              setProfile(p);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setProfile(null);
          lastFetchedUserId.current = null;
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during signOut:', error);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      // Force reload to clear any remaining state if necessary, 
      // but usually navigate is enough.
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
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
