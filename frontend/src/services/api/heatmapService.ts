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
    // MOCK: Backend endpoint not implemented yet
    return {
      id: 'mock-zone-1',
      location: { latitude: lat, longitude: lng },
      radius: 500,
      safetyScore: 65,
      crimeCount: 12,
      mostCommonCrimeType: 'theft',
      recentIncidents: [],
    };
  },

  /**
   * Get recent crimes within radius
   */
  getRecentCrimes: async (
    lat: number,
    lng: number,
    radius: number = 1000
  ): Promise<Crime[]> => {
    // MOCK: Backend endpoint not implemented yet
    return [];
  },

  /**
   * Get area statistics
   */
  getStatistics: async (
    lat: number,
    lng: number,
    radius: number = 500
  ): Promise<AreaStats> => {
    // MOCK: Backend endpoint not implemented yet
    return {
      safetyScore: 85,
      nearbyUsers: 142,
      recentAlerts: 3,
      crimeRate: 2.5,
      lastUpdated: new Date().toISOString(),
    };
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
