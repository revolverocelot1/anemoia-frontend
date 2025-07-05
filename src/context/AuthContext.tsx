import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  demoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // First check if we have a stored user
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
        
        // Then verify the token is still valid
        if (authService.isAuthenticated()) {
          try {
            const profile = await authService.getProfile();
            setUser(profile);
            authService.storeUser(profile);
          } catch (error) {
            // Token might be expired, clear it
            console.error('Auth verification failed:', error);
            authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    authService.storeUser(response.user);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const response = await authService.signup(email, password, name);
    setUser(response.user);
    authService.storeUser(response.user);
  };

  const demoLogin = async () => {
    const response = await authService.demoLogin();
    setUser(response.user);
    authService.storeUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextValue = {
    isAuthenticated: !!user && authService.isAuthenticated(),
    user,
    isLoading,
    login,
    signup,
    logout,
    demoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}; 