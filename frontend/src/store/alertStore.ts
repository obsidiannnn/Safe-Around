import { create } from 'zustand';
import { Alert } from '@/types/models';
import { alertService } from '@/services/api/alertService';
import { locationService } from '@/services/location/locationService';

interface AlertState {
  activeAlert: Alert | null;
  alertHistory: Alert[];
  nearbyAlerts: Alert[];
  isAlertActive: boolean;
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
  respondToAlert: (alertId: string) => Promise<void>;
  updateAlertStatus: (status: 'active' | 'resolved' | 'cancelled') => void;
  fetchHistory: () => Promise<void>;
  fetchActiveAlerts: (location: { latitude: number; longitude: number }, radius: number) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  activeAlert: null,
  alertHistory: [],
  nearbyAlerts: [],
  isAlertActive: false,
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

  respondToAlert: async (alertId: string) => {
    try {
      const location = await locationService.getCurrentLocation();
      if (!location) {
        throw new Error('Could not get current location');
      }
      await alertService.respondToAlert(alertId, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      set((state) => ({ respondersCount: state.respondersCount + 1 }));
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
  
  fetchHistory: async () => {
    try {
      const history = await alertService.getAlertHistory();
      set({ alertHistory: history });
    } catch (error) {
      console.error('Error fetching alert history:', error);
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
