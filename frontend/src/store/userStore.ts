import { create } from 'zustand';
import { EmergencyContact } from '@/types/models';

interface UserState {
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (contactId: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  emergencyContacts: [],
  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),
  addEmergencyContact: (contact) =>
    set((state) => ({
      emergencyContacts: [...state.emergencyContacts, contact],
    })),
  removeEmergencyContact: (contactId) =>
    set((state) => ({
      emergencyContacts: state.emergencyContacts.filter((c) => c.id !== contactId),
    })),
}));
