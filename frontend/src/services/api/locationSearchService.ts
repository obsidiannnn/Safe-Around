import { apiClient } from './client';

export interface LocationSearchResult {
  latitude: number;
  longitude: number;
  address: string;
}

export const locationSearchService = {
  async search(
    query: string,
    near?: { latitude: number; longitude: number } | null,
  ): Promise<LocationSearchResult> {
    const response = await apiClient.get('/location/search', {
      params: {
        query,
        ...(near
          ? {
              lat: near.latitude,
              lng: near.longitude,
            }
          : {}),
      },
      timeout: 15000,
    });

    const payload = response.data?.data;
    return {
      latitude: Number(payload?.latitude ?? 0),
      longitude: Number(payload?.longitude ?? 0),
      address: String(payload?.address ?? query),
    };
  },
};
