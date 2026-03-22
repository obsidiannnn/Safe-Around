import React, { useEffect, useState } from 'react';
import MapView, { Heatmap, Circle } from 'react-native-maps';
import { Platform } from 'react-native';
import { heatmapService } from '@/services/api/heatmapService';

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface Props {
  mapRef: React.RefObject<MapView>;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  onCrimeDataLoaded?: (count: number) => void;
}

export default function CrimeHeatmapOverlay({ bounds, onCrimeDataLoaded }: Props) {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  useEffect(() => {
    if (bounds.north !== 0) {
      loadHeatmapData();
    }
  }, [bounds]);

  const loadHeatmapData = async () => {
    try {
      const crimeData = await heatmapService.getCrimeData(bounds);
      
      // Convert to heatmap points with dynamic time-decay weights
      const points: HeatmapPoint[] = crimeData.map(crime => {
        // AI Time Decay: Use dynamic weight_pct (0-100) if available, else fallback to severity
        const normalizedWeight = crime.weight_pct !== undefined 
          ? Math.max(0.1, crime.weight_pct / 100.0) // Floor at 0.1 so even old crimes show faintly
          : (crime.severity || 1) / 4.0;

        return {
          latitude: crime.latitude,
          longitude: crime.longitude,
          weight: normalizedWeight,
        };
      });

      setHeatmapPoints(points);
      onCrimeDataLoaded?.(points.length);
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
    }
  };

  // For Android/iOS native heatmap (Requires Google Maps Provider)
  // CRITICAL: We only use native Heatmap on Android or if specifically enabled. 
  // iOS Expo Go often lacks the AIRMapHeatmap native config, causing crashes.
  const useNativeHeatmap = Platform.OS === 'android'; 

  if (useNativeHeatmap) {
    if (heatmapPoints.length === 0) return null;
    
    return (
      <Heatmap
        points={heatmapPoints}
        radius={40}
        opacity={0.7}
        gradient={{
          colors: ['#4CAF50', '#FFEB3B', '#FF9800', '#F44336'],
          startPoints: [0.2, 0.4, 0.6, 1.0],
          colorMapSize: 256,
        }}
      />
    );
  }

  // Helper to interpolate color based on weight (0.25 to 1.0)
  const getInterpolatedColor = (weight: number, alpha: number) => {
    // Green (0,255,0) -> Yellow (255,255,0) -> Red (255,0,0)
    let r = 0;
    let g = 255;
    
    if (weight <= 0.5) {
      // Green to Yellow
      r = Math.floor((weight / 0.5) * 255);
    } else {
      // Yellow to Red
      r = 255;
      g = Math.floor(255 - ((weight - 0.5) / 0.5) * 255);
    }
    return `rgba(${r}, ${g}, 0, ${alpha})`;
  };

  // Fallback: render simulated gradient circles for iOS Apple Maps
  return (
    <>
      {heatmapPoints.map((point, index) => {
        const baseColor = getInterpolatedColor(point.weight, 0.4);
        const intenseColor = getInterpolatedColor(point.weight, 0.7);
        const maxRadius = 400 * (point.weight + 0.5);

        return (
          <React.Fragment key={index}>
            {/* Outer soft glow */}
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius}
              fillColor={getInterpolatedColor(point.weight, 0.15)}
              strokeColor="transparent"
            />
            {/* Mid intensity */}
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius * 0.6}
              fillColor={baseColor}
              strokeColor="transparent"
            />
            {/* Core center point */}
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius * 0.3}
              fillColor={intenseColor}
              strokeColor="transparent"
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
