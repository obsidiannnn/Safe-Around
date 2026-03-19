import { apiClient } from './client';
import { Alert } from '@/types/models';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CreateAlertRequest {
  type: 'panic' | 'check_in' | 'safe_zone';
  location: {
    latitude: number;
    longitude: number;
  };
  silentMode: boolean;
  message?: string;
  audioUrl?: string;
}

export interface AlertResponse {
  alertId: string;
  status: string;
  notifiedUsers: number;
}

export const alertService = {
  /**
   * Create a new emergency alert
   */
  createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
    const response = await apiClient.post<ApiResponse<Alert>>('/alerts', data);
    return response.data.data!;
  },

  /**
   * Get alert details by ID
   */
  getAlert: async (id: string): Promise<Alert> => {
    const response = await apiClient.get<ApiResponse<Alert>>(`/alerts/${id}`);
    return response.data.data!;
  },

  /**
   * Update alert status
   */
  updateAlertStatus: async (
    id: string,
    status: 'active' | 'resolved' | 'cancelled'
  ): Promise<Alert> => {
    const response = await apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/status`, {
      status,
    });
    return response.data.data!;
  },

  /**
   * Respond to an alert
   */
  respondToAlert: async (
    id: string,
    location: { latitude: number; longitude: number }
  ): Promise<AlertResponse> => {
    const response = await apiClient.post<ApiResponse<AlertResponse>>(
      `/alerts/${id}/respond`,
      { location }
    );
    return response.data.data!;
  },

  /**
   * Get active alerts within radius
   */
  getActiveAlerts: async (
    location: { latitude: number; longitude: number },
    radius: number
  ): Promise<Alert[]> => {
    const response = await apiClient.get<ApiResponse<Alert[]>>('/alerts/active', {
      params: {
        lat: location.latitude,
        lng: location.longitude,
        radius,
      },
    });
    return response.data.data || [];
  },

  /**
   * Escalate alert to emergency services
   */
  escalateAlert: async (id: string, type: 'police' | 'medical' | 'fire'): Promise<void> => {
    await apiClient.post(`/alerts/${id}/escalate`, { type });
  },

  /**
   * Get alert history
   */
  getAlertHistory: async (): Promise<Alert[]> => {
    const response = await apiClient.get<ApiResponse<Alert[]>>('/alerts/history');
    return response.data.data || [];
  },
};
