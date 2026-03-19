import { apiClient } from './client';
import { DangerZone, Location } from '@/types/models';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const geofencingApiService = {
  /**
   * Check if location is in a danger zone
   */
  checkDangerZone: async (lat: number, lng: number): Promise<DangerZone | null> => {
    try {
      const response = await apiClient.get<ApiResponse<DangerZone>>('/geofencing/check', {
        params: { lat, lng },
      });
      return response.data.data || null;
    } catch (error) {
      console.error('Error checking danger zone:', error);
      return null;
    }
  },

  /**
   * Get nearby active users count
   */
  getNearbyUsers: async (lat: number, lng: number, radius: number): Promise<number> => {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/geofencing/nearby-users', {
        params: { lat, lng, radius },
      });
      return response.data.data?.count || 0;
    } catch (error) {
      console.error('Error getting nearby users:', error);
      return 0;
    }
  },

  /**
   * Update user's current location
   */
  updateUserLocation: async (location: Location): Promise<void> => {
    try {
      await apiClient.post('/geofencing/location', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      });
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  /**
   * Get danger zones within map bounds
   */
  getDangerZones: async (bounds: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  }): Promise<DangerZone[]> => {
    try {
      const response = await apiClient.get<ApiResponse<DangerZone[]>>('/geofencing/zones', {
        params: {
          neLat: bounds.northEast.latitude,
          neLng: bounds.northEast.longitude,
          swLat: bounds.southWest.latitude,
          swLng: bounds.southWest.longitude,
        },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting danger zones:', error);
      return [];
    }
  },
};
