import { useEffect } from 'react';
import { useLocationStore } from '@/store/locationStore';
import { locationService } from '@/services/location/locationService';
import { locationApiService } from '@/services/api/locationApiService';
import { useAlertStore } from '@/store/alertStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Custom hook for location tracking and management
 * Handles permissions, tracking, and location updates
 */
export const useLocation = () => {
  const {
    currentLocation,
    isTracking,
    locationHistory,
    nearbyUsers,
    heading,
    setCurrentLocation,
    setIsTracking,
    addToHistory,
    setHeading,
  } = useLocationStore();
  const { isAlertActive } = useAlertStore();
  const { locationSharingMode } = useSettingsStore();

  const startTracking = async () => {
    const hasPermission = await locationService.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
      addToHistory(location);
    }

    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const getCurrentLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
      return location;
    }
    return null;
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  useEffect(() => {
    if (!isTracking) return;

    let lastSyncTime = 0;
    const SYNC_INTERVALMs = 15000; // Sync to backend every 15s max to save battery/bandwidth

    const subscription = locationService.watchPosition((location) => {
      setCurrentLocation(location);
      addToHistory(location);
      if (location.heading !== undefined) {
        setHeading(location.heading);
      }

      // Sync to backend
      const now = Date.now();
      const canShareLocation = locationSharingMode === 'always' || (locationSharingMode === 'alerts_only' && isAlertActive);
      if (canShareLocation && now - lastSyncTime > SYNC_INTERVALMs) {
        locationApiService.updateLocation(location);
        lastSyncTime = now;
      }
    });

    return () => subscription.remove();
  }, [isTracking, isAlertActive, locationSharingMode]);

  return {
    currentLocation,
    isTracking,
    locationHistory,
    nearbyUsers,
    heading,
    startTracking,
    stopTracking,
    getCurrentLocation,
    calculateDistance,
  };
};
