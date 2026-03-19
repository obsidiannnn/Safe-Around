import { create } from 'zustand';
import { Alert } from '@/types/models';

interface AlertState {
  activeAlert: Alert | null;
  alertHistory: Alert[];
  setActiveAlert: (alert: Alert | null) => void;
  addToHistory: (alert: Alert) => void;
  clearHistory: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  activeAlert: null,
  alertHistory: [],
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  addToHistory: (alert) =>
    set((state) => ({ alertHistory: [alert, ...state.alertHistory] })),
  clearHistory: () => set({ alertHistory: [] }),
}));
