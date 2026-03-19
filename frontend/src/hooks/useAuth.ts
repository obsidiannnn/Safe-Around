import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoginFormData, RegisterFormData } from '@/utils/validation';

/**
 * Custom hook for authentication operations
 * Wraps authStore and provides auto-refresh token functionality
 */
export const useAuth = () => {
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    logIn,
    logOut,
    refreshAccessToken,
    updateProfile,
    loadPersistedAuth,
    setError,
  } = useAuthStore();

  // Load persisted auth on mount
  useEffect(() => {
    loadPersistedAuth();
  }, []);

  // Auto-refresh token before expiry (every 50 minutes if token expires in 60 minutes)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const refreshInterval = setInterval(() => {
      refreshAccessToken();
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, accessToken]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    logIn,
    logOut,
    updateProfile,
    clearError: () => setError(null),
  };
};
