import { create } from 'zustand';
import { Location } from '@/types/models';

interface LocationState {
  currentLocation: Location | null;
  isTracking: boolean;
  locationHistory: Location[];
  nearbyUsers: number;
  heading: number | null;
  setCurrentLocation: (location: Location) => void;
  setIsTracking: (isTracking: boolean) => void;
  addToHistory: (location: Location) => void;
  setNearbyUsers: (count: number) => void;
  setHeading: (heading: number | null) => void;
  clearHistory: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  isTracking: false,
  locationHistory: [],
  nearbyUsers: 0,
  heading: null,

  setCurrentLocation: (location) => set({ currentLocation: location }),
  
  setIsTracking: (isTracking) => set({ isTracking }),
  
  addToHistory: (location) =>
    set((state) => ({
      locationHistory: [...state.locationHistory.slice(-99), location],
    })),
  
  setNearbyUsers: (count) => set({ nearbyUsers: count }),
  
  setHeading: (heading) => set({ heading }),
  
  clearHistory: () => set({ locationHistory: [] }),
}));
