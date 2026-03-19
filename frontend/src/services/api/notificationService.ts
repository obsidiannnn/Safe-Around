import { apiClient } from './client';

export interface NotificationSettings {
  emergencyAlerts: boolean;
  dangerZoneWarnings: boolean;
  nearbyIncidents: boolean;
  safetyTips: boolean;
  communityUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const notificationApiService = {
  registerToken: async (token: string, platform: 'ios' | 'android'): Promise<void> => {
    try {
      await apiClient.post('/notifications/register-token', {
        token,
        platform,
      });
    } catch (error) {
      console.error('Error registering notification token:', error);
      throw error;
    }
  },

  updateSettings: async (settings: NotificationSettings): Promise<void> => {
    try {
      await apiClient.put('/notifications/settings', settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  getHistory: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/notifications/history');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await apiClient.delete('/notifications/clear');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  },
};
