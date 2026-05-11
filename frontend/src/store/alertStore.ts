import { create } from 'zustand';
import { Alert } from '@/types/models';
import { alertService } from '@/services/api/alertService';
import { locationService } from '@/services/location/locationService';
import { locationApiService } from '@/services/api/locationApiService';
import { useLocationStore } from '@/store/locationStore';
import { expoPushService } from '@/services/notifications/expoPushService';
import { useAuthStore } from '@/store/authStore';

// Helper function to calculate distance between two points in meters
const calculateDistance = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

interface AlertState {
  activeAlert: Alert | null;
  alertHistory: Alert[];
  nearbyAlerts: Alert[];
  isAlertActive: boolean;
  isHistoryLoading: boolean;
  historyLoadedAt: number | null;
  currentRadius: number;
  respondersCount: number;
  setActiveAlert: (alert: Alert | null) => void;
  addToHistory: (alert: Alert) => void;
  clearHistory: () => void;
  setNearbyAlerts: (alerts: Alert[]) => void;
  setCurrentRadius: (radius: number) => void;
  setRespondersCount: (count: number) => void;
  createAlert: (location: { latitude: number; longitude: number }, silentMode: boolean) => Promise<Alert>;
  cancelAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  respondToAlert: (alertId: string, responseStatus?: 'accepted' | 'declined' | 'arrived' | 'helping', reason?: string) => Promise<void>;
  updateAlertStatus: (status: 'active' | 'resolved' | 'cancelled') => void;
  fetchHistory: (force?: boolean) => Promise<void>;
  fetchActiveAlerts: (location: { latitude: number; longitude: number }, radius: number) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  activeAlert: null,
  alertHistory: [],
  nearbyAlerts: [],
  isAlertActive: false,
  isHistoryLoading: false,
  historyLoadedAt: null,
  currentRadius: 100,
  respondersCount: 0,

  setActiveAlert: (alert) => set({ activeAlert: alert, isAlertActive: !!alert }),

  addToHistory: (alert) =>
    set((state) => ({ alertHistory: [alert, ...state.alertHistory] })),

  clearHistory: () => set({ alertHistory: [] }),

  setNearbyAlerts: (alerts) => set({ nearbyAlerts: alerts }),

  setCurrentRadius: (radius) => set({ currentRadius: radius }),

  setRespondersCount: (count) => set({ respondersCount: count }),

  createAlert: async (location, silentMode) => {
    try {
      const alert = await alertService.createAlert({
        type: 'panic',
        location,
        silentMode,
        message: 'Emergency alert triggered',
      });

      set({
        activeAlert: alert,
        isAlertActive: true,
        currentRadius: alert.currentRadius ?? 100,
        respondersCount: 0,
      });
      get().addToHistory(alert);

      // Send Expo push notifications to nearby users
      try {
        const user = useAuthStore.getState().user;
        const nearbyUsers = await locationApiService.getNearbyUsers(location, 1000);

        if (nearbyUsers && nearbyUsers.length > 0) {
          const tokens = nearbyUsers
            .map(u => u.pushToken)
            .filter((token): token is string => !!token && expoPushService.isValidExpoPushToken(token));

          if (tokens.length > 0) {
            await expoPushService.sendEmergencyAlert(tokens, {
              alertId: alert.id,
              alertType: alert.type,
              latitude: location.latitude,
              longitude: location.longitude,
              userName: user?.name || 'Someone',
            });
            console.log(`✅ Sent emergency notifications to ${tokens.length} nearby users`);
          }
        }
      } catch (notifError) {
        console.warn('Failed to send push notifications:', notifError);
        // Don't fail the alert creation if notifications fail
      }

      return alert;
    } catch (error) {
      console.warn('Error creating alert:', error);
      throw error;
    }
  },

  cancelAlert: async (alertId) => {
    try {
      const alert = await alertService.updateAlertStatus(alertId, 'cancelled');
      if (alert) {
        get().addToHistory(alert);
      }
      set({ activeAlert: null, isAlertActive: false, currentRadius: 100, respondersCount: 0 });
    } catch (error) {
      console.warn('Error cancelling alert:', error);
      throw error;
    }
  },

  resolveAlert: async (alertId) => {
    try {
      const updatedAlert = await alertService.updateAlertStatus(alertId, 'resolved');
      const alert = updatedAlert ?? get().activeAlert;
      if (alert) {
        get().addToHistory({ ...alert, status: 'resolved', resolvedAt: new Date().toISOString() });
      }
      set({ activeAlert: null, isAlertActive: false, currentRadius: 100, respondersCount: 0 });
    } catch (error) {
      console.warn('Error resolving alert:', error);
      throw error;
    }
  },

  respondToAlert: async (alertId: string, responseStatus: 'accepted' | 'declined' | 'arrived' | 'helping' = 'accepted', reason?: string) => {
    try {
      const location = (await locationService.getCurrentLocation()) ??
        useLocationStore.getState().currentLocation ??
        get().activeAlert?.location ??
        null;

      if (!location && (responseStatus === 'accepted' || responseStatus === 'declined')) {
        throw new Error('Could not get current location');
      }

      await alertService.respondToAlert(
        alertId,
        location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
        responseStatus,
        reason,
      );

      if (responseStatus === 'accepted') {
        set((state) => ({ respondersCount: state.respondersCount + 1 }));
      }
    } catch (error) {
      console.warn('Error responding to alert:', error);
      throw error;
    }
  },

  updateAlertStatus: (status: 'active' | 'resolved' | 'cancelled') => {
    const alert = get().activeAlert;
    if (alert) {
      set({ activeAlert: { ...alert, status } });
    }
  },

  fetchHistory: async (force = false) => {
    if (get().isHistoryLoading) {
      return;
    }

    const cachedLoadedAt = get().historyLoadedAt;
    if (!force && cachedLoadedAt && Date.now() - cachedLoadedAt < 15_000 && get().alertHistory.length > 0) {
      return;
    }

    try {
      set({ isHistoryLoading: true });
      const history = await alertService.getAlertHistory();
      set({ alertHistory: history, historyLoadedAt: Date.now() });
    } catch (error) {
      console.error('Error fetching alert history:', error);
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  fetchActiveAlerts: async (location: { latitude: number; longitude: number }, radius: number) => {
    try {
      const alerts = await alertService.getActiveAlerts(location, radius);
      set({ nearbyAlerts: alerts });
    } catch (error) {
      console.error('Error fetching active alerts:', error);
    }
  },
}));
