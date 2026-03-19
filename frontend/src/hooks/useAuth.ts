import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

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
    sendOTP,
    verifyOTP,
    setupProfile,
    logIn,
    logOut,
    refreshAccessToken,
    loadPersistedAuth,
    clearError,
    setError,
  } = useAuthStore();

  // Load persisted auth on mount
  useEffect(() => {
    loadPersistedAuth();
  }, []);

  // Auto-refresh token every 50 minutes (tokens expire in ~60-168 min)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const refreshInterval = setInterval(() => {
      refreshAccessToken();
    }, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, accessToken]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    // OTP-based auth flow
    sendOTP,
    verifyOTP,
    setupProfile,
    // Direct login with phone + password
    logIn,
    logOut,
    clearError,
    setError,
  };
};
