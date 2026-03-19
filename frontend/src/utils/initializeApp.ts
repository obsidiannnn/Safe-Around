import { useAuthStore } from '@/store/authStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { locationService } from '@/services/location/locationService';
import { notificationService } from '@/services/notifications/NotificationService';
import { notificationApiService } from '@/services/api/notificationService';
import { Platform } from 'react-native';

/**
 * Initialize app services on startup
 * Handles auth state, permissions, and service connections
 */
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('Initializing SafeAround...');

    // 1. Load auth state from storage
    const { accessToken, isAuthenticated } = useAuthStore.getState();
    console.log('Auth state loaded:', isAuthenticated);

    // 2. Request critical permissions
    await requestCriticalPermissions();

    // 3. Initialize location tracking if authenticated
    if (isAuthenticated) {
      await initializeLocationTracking();
    }

    // 4. Connect WebSocket if authenticated
    if (isAuthenticated && accessToken) {
      const { connect } = useWebSocketStore.getState();
      connect(accessToken);
      console.log('WebSocket connected');
    }

    // 5. Register push notification token
    if (isAuthenticated) {
      await registerPushToken();
    }

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    // Don't throw - allow app to continue with degraded functionality
  }
};

const requestCriticalPermissions = async (): Promise<void> => {
  try {
    // Request notification permission
    const notificationGranted = await notificationService.requestPermission();
    console.log('Notification permission:', notificationGranted);

    // Request location permission
    const locationGranted = await locationService.requestPermissions();
    console.log('Location permission:', locationGranted);
  } catch (error) {
    console.error('Error requesting permissions:', error);
  }
};

const initializeLocationTracking = async (): Promise<void> => {
  try {
    const hasPermission = await locationService.requestPermissions();
    if (hasPermission) {
      // Location tracking will be started by useLocation hook
      console.log('Location tracking ready');
    }
  } catch (error) {
    console.error('Error initializing location tracking:', error);
  }
};

const registerPushToken = async (): Promise<void> => {
  try {
    const token = await notificationService.getToken();
    if (token) {
      const platform = Platform.OS as 'ios' | 'android';
      await notificationApiService.registerToken(token, platform);
      console.log('Push token registered');
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};
