import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase, authService as supabaseAuth } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for demo user first
    const demoUser = localStorage.getItem('demo_user');
    if (demoUser) {
      const mockUser = JSON.parse(demoUser);
      setUser(mockUser as User);
      setSession({} as Session); // Mock session
      setIsLoading(false);
      return;
    }
    
    // Function to handle session recovery from URL
    const handleSessionFromUrl = async () => {
      try {
        // Check if we have authentication parameters in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Checking URL for auth tokens:', {
          hash: window.location.hash,
          accessToken: accessToken ? 'found' : 'not found',
          refreshToken: refreshToken ? 'found' : 'not found',
          allParams: Array.from(hashParams.entries())
        });
        
        if (accessToken && refreshToken) {
          console.log('Found authentication tokens in URL, recovering session...');
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session from URL:', error);
            // Try to navigate to home page anyway
            window.location.href = '/';
          } else {
            console.log('Session recovered successfully', data);
            // Clean up the URL by removing the hash parameters
            window.history.replaceState(null, '', window.location.pathname);
            // Force navigation to home page after successful auth
            if (window.location.pathname === '/' || window.location.pathname === '') {
              // Reload to ensure the app recognizes the new auth state
              window.location.reload();
            }
          }
        }
      } catch (error) {
        console.error('Error handling session from URL:', error);
      }
    };
    
    // Initialize auth
    const initializeAuth = async () => {
      // First, try to recover session from URL if present
      await handleSessionFromUrl();
      
      // Then get the current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // If user just logged in and we're on a login page, redirect to home
      if (_event === 'SIGNED_IN' && window.location.pathname.includes('login')) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    const { error } = await supabaseAuth.signInWithGoogle();
    if (error) throw error;
  };

  const signInWithTwitter = async () => {
    const { error } = await supabaseAuth.signInWithTwitter();
    if (error) throw error;
  };

  const signInWithGithub = async () => {
    const { error } = await supabaseAuth.signInWithGithub();
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabaseAuth.signOut();
    if (error) throw error;
  };

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!session,
    isLoading,
    signInWithGoogle,
    signInWithTwitter,
    signInWithGithub,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useSupabaseAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}; 