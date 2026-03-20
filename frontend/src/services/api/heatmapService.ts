import { apiClient } from './client';
import { DangerZone, Crime, AreaStats, HeatmapTile } from '@/types/models';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const heatmapService = {
  /**
   * Get heatmap tile for specific coordinates
   */
  getTile: async (z: number, x: number, y: number): Promise<string> => {
    const response = await apiClient.get<ApiResponse<{ url: string }>>(
      `/heatmap/tiles/${z}/${x}/${y}`
    );
    return response.data.data?.url || '';
  },

  /**
   * Get danger zone information for a location
   */
  getZoneInfo: async (lat: number, lng: number): Promise<DangerZone> => {
    const response = await apiClient.get<ApiResponse<DangerZone>>('/heatmap/zone', {
      params: { lat, lng },
    });
    return response.data.data!;
  },

  /**
   * Get recent crimes within radius
   */
  getRecentCrimes: async (
    lat: number,
    lng: number,
    radius: number = 1000
  ): Promise<Crime[]> => {
    const response = await apiClient.get<ApiResponse<Crime[]>>('/heatmap/crimes', {
      params: { lat, lng, radius },
    });
    return response.data.data || [];
  },

  /**
   * Get area statistics
   */
  getStatistics: async (
    lat: number,
    lng: number,
    radius: number = 500
  ): Promise<AreaStats> => {
    const response = await apiClient.get<ApiResponse<AreaStats>>('/heatmap/statistics', {
      params: { lat, lng, radius },
    });
    return response.data.data!;
  },

  /**
   * Report a crime or incident
   */
  reportIncident: async (data: {
    type: string;
    location: { latitude: number; longitude: number };
    description: string;
    severity: string;
  }): Promise<void> => {
    await apiClient.post('/heatmap/report', data);
  },
};
