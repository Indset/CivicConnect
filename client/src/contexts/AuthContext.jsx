import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/services/api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.me();
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      if (error.statusCode === 401) {
        setUser(null);
        return null;
      }
      setAuthError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      isAdmin: user?.role === 'admin',
      refreshUser,
      setUser,
      async login(payload) {
        const response = await authApi.login(payload);
        setUser(response.data.user);
        setAuthError(null);
        return response;
      },
      async register(payload) {
        const response = await authApi.register(payload);
        setUser(response.data.user);
        setAuthError(null);
        return response;
      },
      async logout() {
        try {
          await authApi.logout();
        } finally {
          setUser(null);
          setAuthError(null);
        }
      },
    }),
    [user, loading, authError, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
