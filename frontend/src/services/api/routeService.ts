import { apiClient } from './client';

export interface SafeRouteResponse {
  route_id: string;
  name: string;
  distance_meters: number;
  duration_minutes: number;
  safety_score: number;
  risk_level: string;
  danger_zones_count: number;
  polyline: string;
  color: string;
}

export const routeApiService = {
  async getSafeRoutes(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    mode: 'walking' | 'driving' | 'transit' | 'bicycling',
  ): Promise<SafeRouteResponse[]> {
    const response = await apiClient.post('/routes/safe', {
      origin,
      destination,
      mode,
    });

    return response.data?.data?.routes ?? [];
  },
};
