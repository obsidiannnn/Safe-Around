import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LocationSharingMode = 'always' | 'alerts_only' | 'never';

interface SettingsState {
  locationSharingMode: LocationSharingMode;
  dangerZoneWarningDistance: number;
  batteryOptimization: boolean;
  offlineMode: boolean;
  setLocationSharingMode: (mode: LocationSharingMode) => void;
  setDangerZoneWarningDistance: (distance: number) => void;
  setBatteryOptimization: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locationSharingMode: 'alerts_only',
      dangerZoneWarningDistance: 500,
      batteryOptimization: true,
      offlineMode: false,

      setLocationSharingMode: (mode) => set({ locationSharingMode: mode }),
      setDangerZoneWarningDistance: (distance) => set({ dangerZoneWarningDistance: distance }),
      setBatteryOptimization: (enabled) => set({ batteryOptimization: enabled }),
      setOfflineMode: (enabled) => set({ offlineMode: enabled }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
