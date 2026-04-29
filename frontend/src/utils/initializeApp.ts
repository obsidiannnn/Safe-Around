import { useAuthStore } from '@/store/authStore';

/**
 * Initialize app services on startup
 * Handles auth state, permissions, and service connections
 */
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('Initializing SafeAround...');

    // Keep startup lightweight. Authenticated realtime services
    // are staged later after the app shell is visible.
    await useAuthStore.getState().loadPersistedAuth();
    const { isAuthenticated } = useAuthStore.getState();
    console.log('Auth state loaded:', isAuthenticated);

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    // Don't throw - allow app to continue with degraded functionality
  }
};
