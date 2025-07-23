import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase.config';

// Create Supabase client
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export default supabase;

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: 'google' | 'twitter' | 'github';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Auth helpers
export const authService = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  async signInWithTwitter() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  async signInWithGithub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// User profile helpers with better error handling
export const userService = {
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Profile not found - this is expected for new users
        console.log('Profile not found for user:', userId);
        return { data: null, error: null };
      }
      
      return { data, error };
    } catch (err) {
      console.error('Error fetching profile:', err);
      return { data: null, error: err };
    }
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        return await this.createProfile({ ...updates, id: userId });
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { data: null, error: err };
    }
  },

  async createProfile(user: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([user])
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('Error creating profile:', err);
      return { data: null, error: err };
    }
  }
}; 