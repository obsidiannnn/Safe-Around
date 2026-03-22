import { apiClient } from './client';

interface CrimePoint {
  latitude: number;
  longitude: number;
  severity: number;
  crime_type: string;
  weight_pct?: number;
}

export const heatmapService = {
  // Get crime data points for map bounds
  async getCrimeData(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<CrimePoint[]> {
    const response = await apiClient.get('/heatmap/data', {
      params: bounds,
    });
    return response.data?.data || [];
  },

  // Get grid data for smooth heatmap
  async getGridData(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) {
    const response = await apiClient.get('/heatmap/grid', {
      params: bounds,
    });
    return response.data.data;
  },

  // Get statistics for a point
  async getStatistics(lat: number, lng: number) {
    const response = await apiClient.get('/heatmap/statistics', {
      params: { lat, lng },
    });
    return response.data;
  },
};
