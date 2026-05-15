import { create } from 'zustand';

interface StartupState {
  safeMode: boolean;
  setSafeMode: (safeMode: boolean) => void;
}

export const useStartupStore = create<StartupState>((set) => ({
  safeMode: false,
  setSafeMode: (safeMode) => set({ safeMode }),
}));
