import { apiClient } from './client';
import { Location } from '@/types/models';

export interface NearbyUserLocation extends Location {
  userId: string;
  recordedAt?: string;
}

const NEARBY_USERS_CACHE_TTL_MS = 10_000;

type NearbyUsersCacheEntry = {
  data: NearbyUserLocation[];
  expiresAt: number;
};

const nearbyUsersCache = new Map<string, NearbyUsersCacheEntry>();

const toNearbyUsersCacheKey = (location: Location, radius: number) =>
  `${location.latitude.toFixed(4)}:${location.longitude.toFixed(4)}:${radius}`;

const getCachedNearbyUsers = (cacheKey: string, allowStale: boolean = false): NearbyUserLocation[] | null => {
  const entry = nearbyUsersCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (!allowStale && entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.data;
};

const setCachedNearbyUsers = (cacheKey: string, data: NearbyUserLocation[]) => {
  nearbyUsersCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + NEARBY_USERS_CACHE_TTL_MS,
  });
};

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
  getNearbyUsers: async (
    location: Location,
    radius: number = 5000,
    forceRefresh: boolean = false
  ): Promise<NearbyUserLocation[]> => {
    const cacheKey = toNearbyUsersCacheKey(location, radius);
    const cachedUsers = !forceRefresh ? getCachedNearbyUsers(cacheKey) : null;
    if (cachedUsers) {
      return cachedUsers;
    }

    try {
      const response = await apiClient.get('/location/nearby', {
        params: {
          lat: location.latitude,
          lng: location.longitude,
          radius,
        },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (response.status === 429) {
        console.warn('Nearby users request was rate limited; using the last map state for now.');
        return getCachedNearbyUsers(cacheKey, true) ?? [];
      }

      const users = (response.data?.data || []).map((user: any) => ({
        userId: String(user.user_id ?? user.userId ?? user.id),
        latitude: Number(user.latitude),
        longitude: Number(user.longitude),
        recordedAt: user.recorded_at ?? user.recordedAt,
      })).filter((user: NearbyUserLocation) => Number.isFinite(user.latitude) && Number.isFinite(user.longitude));

      setCachedNearbyUsers(cacheKey, users);
      return users;
    } catch (error) {
      console.warn('Failed to get nearby users:', error);
      return getCachedNearbyUsers(cacheKey, true) ?? [];
    }
  }
};
