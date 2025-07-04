import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'anemoia_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setTokenState(stored);
    }
  }, []);

  // Fetch user profile when token changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await authService.getProfile(token);
        setUser(userProfile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Token might be invalid, clear it
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [token]);

  const setToken = (t: string | null) => {
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
    setTokenState(t);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value: AuthContextValue = {
    token,
    isAuthenticated: Boolean(token),
    user,
    setToken,
    setUser,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}; 