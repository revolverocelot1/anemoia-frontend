import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';

// Initialize Supabase client
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export interface User {
  id: string;
  email: string;
  name?: string;
  provider?: string;
}

export interface AuthResponse {
  user: User | null;
  session: any;
  error?: Error;
}

class AuthService {
  // Get current user from Supabase
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.user_metadata?.full_name,
      provider: user.app_metadata?.provider
    };
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  // Get auth session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // Sign up with email/password
  async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) {
      return { user: null, session: null, error };
    }
    
    const user: User = {
      id: data.user?.id || '',
      email: data.user?.email || '',
      name: data.user?.user_metadata?.name
    };
    
    return { user, session: data.session };
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { user: null, session: null, error };
    }
    
    const user: User = {
      id: data.user?.id || '',
      email: data.user?.email || '',
      name: data.user?.user_metadata?.name
    };
    
    return { user, session: data.session };
  }

  // Alias for signIn to maintain compatibility
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.signIn(email, password);
  }

  // Google OAuth login
  async googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    if (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  // Twitter OAuth login
  async twitterLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Twitter login error:', error);
      throw error;
    }
  }

  // GitHub OAuth login
  async githubLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('GitHub login error:', error);
      throw error;
    }
  }

  // Demo login (create anonymous session)
  async demoLogin(): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      return { user: null, session: null, error };
    }
    
    const user: User = {
      id: data.user?.id || '',
      email: 'demo@anemoia.app',
      name: 'Demo User'
    };
    
    return { user, session: data.session };
  }

  // Sign out
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    window.location.href = '/login';
  }

  // Handle OAuth callback
  async handleOAuthCallback(): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return { user: null, session: null, error: error || new Error('No session') };
    }
    
    const user: User = {
      id: data.session.user.id,
      email: data.session.user.email || '',
      name: data.session.user.user_metadata?.name || data.session.user.user_metadata?.full_name,
      provider: data.session.user.app_metadata?.provider
    };
    
    return { user, session: data.session };
  }

  // Listen for auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Verify authentication status
  async verifyAuth(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }
}

export const authService = new AuthService();
export default authService; 