import { create } from 'zustand';
import { Location } from '@/types/models';

interface LocationState {
  currentLocation: Location | null;
  isTracking: boolean;
  setCurrentLocation: (location: Location) => void;
  setIsTracking: (isTracking: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  isTracking: false,
  setCurrentLocation: (location) => set({ currentLocation: location }),
  setIsTracking: (isTracking) => set({ isTracking }),
}));
