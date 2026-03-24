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
        radius={80} // Increased for a more realistic spread
        opacity={0.6} // Softer opacity for better blending
        gradient={{
          colors: [
            'rgba(16, 185, 129, 0.4)', // Safe Green (Very faint)
            'rgba(16, 185, 129, 0.8)', // Safe Green (Opaque)
            'rgba(245, 158, 11, 0.9)', // Warning Amber
            'rgba(239, 68, 68, 1.0)',  // Emergency Red
          ],
          startPoints: [0.1, 0.3, 0.6, 1.0], // Smoother transition
          colorMapSize: 512, // Higher density for better gradients
        }}
      />
    );
  }

  // Helper to interpolate color based on weight (0.1 to 1.0)
  const getInterpolatedColor = (weight: number, alpha: number) => {
    // Green (16, 185, 129) -> Amber (245, 158, 11) -> Red (239, 68, 68)
    if (weight <= 0.4) {
      return `rgba(16, 185, 129, ${alpha})`;
    } else if (weight <= 0.7) {
      return `rgba(245, 158, 11, ${alpha})`;
    }
    return `rgba(239, 68, 68, ${alpha})`;
  };

  // Fallback: render simulated gradient circles for iOS Apple Maps
  return (
    <>
      {heatmapPoints.map((point, index) => {
        const maxRadius = 500 * (point.weight + 0.5); // Larger spread

        return (
          <React.Fragment key={index}>
            {/* Multi-layered soft glow for realistic spread */}
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius}
              fillColor={getInterpolatedColor(point.weight, 0.05)}
              strokeColor="transparent"
            />
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius * 0.7}
              fillColor={getInterpolatedColor(point.weight, 0.12)}
              strokeColor="transparent"
            />
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius * 0.4}
              fillColor={getInterpolatedColor(point.weight, 0.25)}
              strokeColor="transparent"
            />
            {/* Core center point */}
            <Circle
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={maxRadius * 0.15}
              fillColor={getInterpolatedColor(point.weight, 0.5)}
              strokeColor="transparent"
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
