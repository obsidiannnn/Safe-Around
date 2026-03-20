import { apiClient } from './client';
import { Location } from '@/types/models';

export const locationApiService = {
  /**
   * Sync current location to backend
   */
  updateLocation: async (location: Location): Promise<void> => {
    try {
      await apiClient.post('/location', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
      });
    } catch (error) {
      console.error('Failed to sync location with backend:', error);
    }
  },

  /**
   * Get nearby users from backend
   */
  getNearbyUsers: async (radius: number = 5000): Promise<Location[]> => {
    try {
      const response = await apiClient.get('/location/nearby', {
        params: { radius }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to get nearby users:', error);
      return [];
    }
  }
};
