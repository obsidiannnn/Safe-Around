import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { AreaStats } from '@/types/models';

export interface CrimePoint {
  latitude: number;
  longitude: number;
  severity: number;
  crime_type: string;
  weight_pct?: number;
  incident_count?: number;
}

export type HeatmapZoomBucket = 'india-low' | 'india-medium' | 'india-high';

const AREA_STATS_CACHE_TTL_MS = 20_000;
const NATIONAL_HEATMAP_CACHE_TTL_MS = 10 * 60 * 1000;
const NATIONAL_HEATMAP_STORAGE_PREFIX = 'heatmap:india:v2:';

type AreaStatsCacheEntry = {
  data: AreaStats;
  expiresAt: number;
};

type HeatmapCacheEntry = {
  data: CrimePoint[];
  expiresAt: number;
  cachedAt: number;
};

const areaStatsCache = new Map<string, AreaStatsCacheEntry>();
const nationalHeatmapMemoryCache = new Map<HeatmapZoomBucket, HeatmapCacheEntry>();

const areaStatsCacheKey = (lat: number, lng: number) => `${lat.toFixed(3)}:${lng.toFixed(3)}`;
const nationalHeatmapStorageKey = (bucket: HeatmapZoomBucket) => `${NATIONAL_HEATMAP_STORAGE_PREFIX}${bucket}`;

const isHeatmapCacheFresh = (entry: HeatmapCacheEntry | null | undefined) =>
  !!entry && entry.expiresAt > Date.now();

const parseHeatmapCacheEntry = (raw: string | null): HeatmapCacheEntry | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as HeatmapCacheEntry;
    if (!Array.isArray(parsed?.data)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

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

  async getTile(z: number, x: number, y: number): Promise<string | null> {
    const response = await apiClient.get(`/heatmap/tiles/${z}/${x}/${y}`, {
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status !== 200) {
      return null;
    }

    return response.request?.responseURL ?? null;
  },

  async getIndiaHeatmapData(
    zoomBucket: HeatmapZoomBucket,
  ): Promise<{ data: CrimePoint[]; stale: boolean }> {
    const cachedInMemory = nationalHeatmapMemoryCache.get(zoomBucket);
    if (cachedInMemory) {
      return {
        data: cachedInMemory.data,
        stale: !isHeatmapCacheFresh(cachedInMemory),
      };
    }

    const cachedOnDisk = parseHeatmapCacheEntry(
      await AsyncStorage.getItem(nationalHeatmapStorageKey(zoomBucket)),
    );

    if (cachedOnDisk) {
      nationalHeatmapMemoryCache.set(zoomBucket, cachedOnDisk);
      return {
        data: cachedOnDisk.data,
        stale: !isHeatmapCacheFresh(cachedOnDisk),
      };
    }

    const fresh = await this.refreshIndiaHeatmapData(zoomBucket);
    return { data: fresh, stale: false };
  },

  async refreshIndiaHeatmapData(zoomBucket: HeatmapZoomBucket): Promise<CrimePoint[]> {
    const response = await apiClient.get('/heatmap/data', {
      params: {
        scope: 'india',
        zoom_bucket: zoomBucket,
      },
    });

    const data: CrimePoint[] = (response.data?.data || []).map((point: any) => ({
      latitude: Number(point?.latitude ?? 0),
      longitude: Number(point?.longitude ?? 0),
      severity: Number(point?.severity ?? 1),
      crime_type: point?.crime_type ?? 'incident',
      weight_pct: Number(point?.weight_pct ?? 0),
      incident_count: Number(point?.incident_count ?? 0),
    }));

    const cacheEntry: HeatmapCacheEntry = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + NATIONAL_HEATMAP_CACHE_TTL_MS,
    };

    nationalHeatmapMemoryCache.set(zoomBucket, cacheEntry);
    await AsyncStorage.setItem(
      nationalHeatmapStorageKey(zoomBucket),
      JSON.stringify(cacheEntry),
    );

    return data;
  },

  // Get statistics for a point
  async getStatistics(lat: number, lng: number): Promise<AreaStats> {
    const cacheKey = areaStatsCacheKey(lat, lng);
    const cached = areaStatsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const response = await apiClient.get('/heatmap/statistics', {
      params: { lat, lng },
    });
    const stats = {
      safetyScore: Number(response.data?.safetyScore ?? 0),
      nearbyUsers: Number(response.data?.nearbyUsers ?? 0),
      recentAlerts: Number(response.data?.recentAlerts ?? 0),
      crimeRate: Number(response.data?.crimeRate ?? 0),
      lastUpdated: response.data?.lastUpdated ?? new Date().toISOString(),
    };

    areaStatsCache.set(cacheKey, {
      data: stats,
      expiresAt: Date.now() + AREA_STATS_CACHE_TTL_MS,
    });

    return stats;
  },
};
