import { create } from 'zustand';
import { AreaStats, DangerZone } from '@/types/models';

type MapType = 'standard' | 'satellite' | 'hybrid';

interface MapState {
  mapType: MapType;
  showHeatmap: boolean;
  heatmapOpacity: number;
  currentStats: AreaStats | null;
  selectedZone: DangerZone | null;
  cachedTiles: Map<string, string>;
  setMapType: (type: MapType) => void;
  setShowHeatmap: (show: boolean) => void;
  setHeatmapOpacity: (opacity: number) => void;
  setCurrentStats: (stats: AreaStats | null) => void;
  setSelectedZone: (zone: DangerZone | null) => void;
  cacheTile: (key: string, url: string) => void;
  getCachedTile: (key: string) => string | undefined;
}

export const useMapStore = create<MapState>((set, get) => ({
  mapType: 'standard',
  showHeatmap: true,
  heatmapOpacity: 0.6,
  currentStats: null,
  selectedZone: null,
  cachedTiles: new Map(),

  setMapType: (type) => set({ mapType: type }),
  
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  
  setHeatmapOpacity: (opacity) => set({ heatmapOpacity: opacity }),
  
  setCurrentStats: (stats) => set({ currentStats: stats }),
  
  setSelectedZone: (zone) => set({ selectedZone: zone }),
  
  cacheTile: (key, url) => {
    const tiles = get().cachedTiles;
    tiles.set(key, url);
    set({ cachedTiles: tiles });
  },
  
  getCachedTile: (key) => {
    return get().cachedTiles.get(key);
  },
}));
