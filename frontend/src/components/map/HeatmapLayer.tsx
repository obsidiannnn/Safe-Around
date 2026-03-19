import React, { useEffect, useState } from 'react';
import { Overlay } from 'react-native-maps';
import { heatmapService } from '@/services/api/heatmapService';
import { useMapStore } from '@/store/mapStore';

interface HeatmapLayerProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

/**
 * Heatmap overlay layer for crime data visualization
 * Color gradient: Green (safe) → Yellow → Orange → Red (dangerous)
 */
export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ region }) => {
  const { showHeatmap, heatmapOpacity, cacheTile, getCachedTile } = useMapStore();
  const [tiles, setTiles] = useState<string[]>([]);

  useEffect(() => {
    if (!showHeatmap) return;

    const fetchTiles = async () => {
      try {
        // Calculate tile coordinates based on zoom level
        const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
        const tileX = Math.floor(((region.longitude + 180) / 360) * Math.pow(2, zoom));
        const tileY = Math.floor(
          ((1 - Math.log(Math.tan((region.latitude * Math.PI) / 180) + 1 / Math.cos((region.latitude * Math.PI) / 180)) / Math.PI) / 2) *
            Math.pow(2, zoom)
        );

        const tileKey = `${zoom}-${tileX}-${tileY}`;
        
        // Check cache first
        const cachedUrl = getCachedTile(tileKey);
        if (cachedUrl) {
          setTiles([cachedUrl]);
          return;
        }

        // Fetch from API
        const tileUrl = await heatmapService.getTile(zoom, tileX, tileY);
        if (tileUrl) {
          cacheTile(tileKey, tileUrl);
          setTiles([tileUrl]);
        }
      } catch (error) {
        console.error('Error fetching heatmap tiles:', error);
      }
    };

    // Debounce tile fetching
    const timer = setTimeout(fetchTiles, 500);
    return () => clearTimeout(timer);
  }, [region, showHeatmap]);

  if (!showHeatmap || tiles.length === 0) return null;

  return (
    <>
      {tiles.map((tileUrl, index) => (
        <Overlay
          key={`${tileUrl}-${index}`}
          bounds={[
            [region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
            [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2],
          ]}
          image={{ uri: tileUrl }}
          opacity={heatmapOpacity}
        />
      ))}
    </>
  );
};
