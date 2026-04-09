import { apiClient } from './client';
import { Location } from '@/types/models';

export interface NearbyUserLocation extends Location {
  userId: string;
  recordedAt?: string;
}

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
  getNearbyUsers: async (location: Location, radius: number = 5000): Promise<NearbyUserLocation[]> => {
    try {
      const response = await apiClient.get('/location/nearby', {
        params: {
          lat: location.latitude,
          lng: location.longitude,
          radius,
        }
      });
      return (response.data?.data || []).map((user: any) => ({
        userId: String(user.user_id ?? user.userId ?? user.id),
        latitude: Number(user.latitude),
        longitude: Number(user.longitude),
        recordedAt: user.recorded_at ?? user.recordedAt,
      })).filter((user: NearbyUserLocation) => Number.isFinite(user.latitude) && Number.isFinite(user.longitude));
    } catch (error) {
      console.error('Failed to get nearby users:', error);
      return [];
    }
  }
};
