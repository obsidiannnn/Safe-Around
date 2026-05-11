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

<<<<<<< ours
  // For Android/iOS native heatmap (Requires Google Maps Provider)
  // CRITICAL: We only use native Heatmap on Android or if specifically enabled. 
  // iOS Expo Go often lacks the AIRMapHeatmap native config, causing crashes.
  const useNativeHeatmap = Platform.OS === 'android'; 
=======
  // Native heatmap rendering is more fragile in release Android builds.
  // Use the safer circle-based renderer outside dev to protect startup stability.
  const useNativeHeatmap = Platform.OS === 'android' && __DEV__;
>>>>>>> theirs

  if (useNativeHeatmap) {
    if (heatmapPoints.length === 0) return null;
    
    return (
      <Heatmap
        points={heatmapPoints}
        radius={50} // Capped at 50 to prevent "Radius not within bounds"
        opacity={0.7} 
        gradient={{
          colors: [
<<<<<<< ours
            'rgba(34, 197, 94, 0.2)',  // Safe Green (Fade in)
            'rgba(34, 197, 94, 0.5)',  // Safe Green (Mid)
            'rgba(234, 179, 8, 0.7)',  // Warning Yellow
            'rgba(239, 68, 68, 0.9)',  // Danger Red
          ],
          startPoints: [0.01, 0.25, 0.6, 1.0], // Wide spread for organic look
          colorMapSize: 2000, // Maximum resolution for smooth blending
=======
            'rgba(34, 197, 94, 0.08)',
            'rgba(34, 197, 94, 0.22)',
            'rgba(250, 204, 21, 0.48)',
            'rgba(249, 115, 22, 0.76)',
            'rgba(220, 38, 38, 0.94)',
          ],
          startPoints: [0.02, 0.24, 0.5, 0.76, 1.0],
          colorMapSize: 2000,
>>>>>>> theirs
        } as any}
      />
    );
  }

<<<<<<< ours
  // Helper to interpolate color based on weight (0.1 to 1.0)
  const getInterpolatedColor = (weight: number, alpha: number) => {
    // Green (34, 197, 94) -> Amber (245, 158, 11) -> Red (239, 68, 68)
    if (weight <= 0.4) {
      return `rgba(34, 197, 94, ${alpha})`;
    } else if (weight <= 0.7) {
      return `rgba(245, 158, 11, ${alpha})`;
    }
    return `rgba(239, 68, 68, ${alpha})`;
=======
  const getLayerColor = (weight: number, layer: 'aura' | 'cool' | 'mid' | 'warm' | 'hot') => {
    if (layer === 'aura') {
      return weight > 0.7 ? 'rgba(22, 163, 74, 0.07)' : 'rgba(34, 197, 94, 0.06)';
    }

    if (layer === 'cool') {
      return weight > 0.7 ? 'rgba(74, 222, 128, 0.10)' : 'rgba(34, 197, 94, 0.09)';
    }

    if (layer === 'mid') {
      if (weight > 0.72) return 'rgba(250, 204, 21, 0.18)';
      if (weight > 0.45) return 'rgba(163, 230, 53, 0.15)';
      return 'rgba(74, 222, 128, 0.13)';
    }

    if (layer === 'warm') {
      if (weight > 0.8) return 'rgba(249, 115, 22, 0.24)';
      if (weight > 0.55) return 'rgba(250, 204, 21, 0.20)';
      return 'rgba(163, 230, 53, 0.15)';
    }

    if (weight > 0.85) return 'rgba(220, 38, 38, 0.80)';
    if (weight > 0.68) return 'rgba(239, 68, 68, 0.56)';
    if (weight > 0.48) return 'rgba(249, 115, 22, 0.32)';
    return 'rgba(234, 179, 8, 0.22)';
  };

  const getLayerRadii = (weight: number) => {
    const baseRadius = 45 + weight * 135;

    return {
      aura: baseRadius * 3.8,
      cool: baseRadius * 2.5,
      mid: baseRadius * 1.6,
      warm: baseRadius * 0.9,
      hot: baseRadius * 0.35,
    };
>>>>>>> theirs
  };

  // Fallback/Simulated: Multi-layered soft glow for "spreading" effect
  // Flattening to avoid React.Fragment issues in some react-native-maps versions
  return (
    <>
      {heatmapPoints.flatMap((point, idx) => {
        const weight = point.weight || 0.1;
<<<<<<< ours
        const baseRadius = 2500 * (weight + 0.3);
=======
        const radii = getLayerRadii(weight);
>>>>>>> theirs
        const pointKey = `crime-${point.latitude}-${point.longitude}-${idx}`;

        return [
          <Circle
            key={`${pointKey}-outer`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
<<<<<<< ours
            radius={baseRadius * 1.5}
            fillColor={getInterpolatedColor(weight, 0.03)}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-primary`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={baseRadius}
            fillColor={getInterpolatedColor(weight, 0.08)}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-inner`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={baseRadius * 0.6}
            fillColor={getInterpolatedColor(weight, 0.15)}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-hotspot`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={baseRadius * 0.25}
            fillColor={getInterpolatedColor(weight, 0.35)}
=======
            radius={radii.aura}
            fillColor={getLayerColor(weight, 'aura')}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-cool`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={radii.cool}
            fillColor={getLayerColor(weight, 'cool')}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-mid`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={radii.mid}
            fillColor={getLayerColor(weight, 'mid')}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-warm`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={radii.warm}
            fillColor={getLayerColor(weight, 'warm')}
            strokeColor="transparent"
          />,
          <Circle
            key={`${pointKey}-hot`}
            center={{ latitude: point.latitude, longitude: point.longitude }}
            radius={radii.hot}
            fillColor={getLayerColor(weight, 'hot')}
>>>>>>> theirs
            strokeColor="transparent"
          />
        ];
      })}
    </>
  );
}
