import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/services/api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true  → hydration in progress (app just loaded, cookie check pending)
  // false → hydration done, user is either populated or null
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.user);
      return response.data.user;
    } catch {
      // 401 = no valid cookie → unauthenticated, not an error worth surfacing
      setUser(null);
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
      isAdmin: user?.role === 'admin',
      refreshUser,
      setUser,
      async login(payload) {
        const response = await authApi.login(payload);
        setUser(response.data.user);
        return response;
      },
      async register(payload) {
        const response = await authApi.register(payload);
        setUser(response.data.user);
        return response;
      },
      async logout() {
        try {
          await authApi.logout();
        } finally {
          // Always clear local state even if the server call fails
          setUser(null);
        }
      },
    }),
    [user, loading, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
