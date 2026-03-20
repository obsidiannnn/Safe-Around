import { apiClient } from './client';
import { BackendUser } from '@/types/api';
import { EmergencyContact } from '@/types/models';

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profile_picture_url?: string;
}

export interface AddContactRequest {
  name: string;
  phone: string;
  relationship?: string;
  is_priority?: boolean;
}

export const profileApiService = {
  /**
   * GET /api/v1/users/profile
   * Fetch the current user's live profile with stats
   */
  getProfile: async (): Promise<BackendUser> => {
    const response = await apiClient.get<{ user: BackendUser }>('/users/profile');
    return response.data.user;
  },

  /**
   * PUT /api/v1/users/profile
   * Update user info (name, email, profile picture)
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<BackendUser> => {
    const response = await apiClient.put<{ user: BackendUser }>('/users/profile', data);
    return response.data.user;
  },

  /**
   * GET /api/v1/users/contacts
   * Fetch all emergency contacts
   */
  getContacts: async (): Promise<EmergencyContact[]> => {
    const response = await apiClient.get<{ contacts: EmergencyContact[] }>('/users/contacts');
    return response.data.contacts || [];
  },

  /**
   * POST /api/v1/users/contacts
   * Add a new emergency contact
   */
  addContact: async (data: AddContactRequest): Promise<EmergencyContact> => {
    const response = await apiClient.post<{ contact: EmergencyContact }>('/users/contacts', data);
    return response.data.contact;
  },

  /**
   * DELETE /api/v1/users/contacts/:id
   * Delete an emergency contact
   */
  deleteContact: async (contactId: number): Promise<void> => {
    await apiClient.delete(`/users/contacts/${contactId}`);
  },
};
