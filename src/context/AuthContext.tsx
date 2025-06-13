import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  user: { name?: string; picture?: string; sub?: string } | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'anemoia_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextValue['user']>(null);

  const parseUser = (jwt: string | null) => {
    if (!jwt) return null;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      const { name, picture, sub, user_id } = payload;
      return { name, picture, sub: sub || user_id };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setTokenState(stored);
      setUser(parseUser(stored));
    }
  }, []);

  const setToken = (t: string | null) => {
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      setUser(parseUser(t));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
    setTokenState(t);
  };

  const logout = () => setToken(null);

  const value: AuthContextValue = {
    token,
    isAuthenticated: Boolean(token),
    user,
    setToken,
    logout,
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