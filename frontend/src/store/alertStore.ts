import { create } from 'zustand';
import { Alert } from '@/types/models';
import { alertService } from '@/services/api/alertService';

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
      
      set({ activeAlert: alert, isAlertActive: true, currentRadius: 100 });
      get().addToHistory(alert);
      
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  cancelAlert: async (alertId) => {
    try {
      await alertService.updateAlertStatus(alertId, 'cancelled');
      set({ activeAlert: null, isAlertActive: false, currentRadius: 100, respondersCount: 0 });
    } catch (error) {
      console.error('Error cancelling alert:', error);
      throw error;
    }
  },

  resolveAlert: async (alertId) => {
    try {
      await alertService.updateAlertStatus(alertId, 'resolved');
      const alert = get().activeAlert;
      if (alert) {
        get().addToHistory({ ...alert, status: 'resolved', resolvedAt: new Date().toISOString() });
      }
      set({ activeAlert: null, isAlertActive: false, currentRadius: 100, respondersCount: 0 });
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  },

  respondToAlert: async (alertId) => {
    try {
      await alertService.respondToAlert(alertId, {
        latitude: 0,
        longitude: 0,
      });
      set((state) => ({ respondersCount: state.respondersCount + 1 }));
    } catch (error) {
      console.error('Error responding to alert:', error);
      throw error;
    }
  },

  updateAlertStatus: (status) => {
    const alert = get().activeAlert;
    if (alert) {
      set({ activeAlert: { ...alert, status } });
    }
  },
}));
