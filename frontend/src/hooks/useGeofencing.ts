import { useEffect, useState } from 'react';
import { DangerZone, Location } from '@/types/models';
import { geofencingService } from '@/services/location/GeofencingService';
import { geofencingApiService } from '@/services/api/geofencingService';
import { useLocationStore } from '@/store/locationStore';

/**
 * Custom hook for geofencing functionality
 * Monitors danger zones and provides zone information
 */
export const useGeofencing = () => {
  const { currentLocation } = useLocationStore();
  const [isInDangerZone, setIsInDangerZone] = useState(false);
  const [currentZone, setCurrentZone] = useState<DangerZone | null>(null);
  const [nearbyZones, setNearbyZones] = useState<DangerZone[]>([]);

  const checkZone = async (location: Location) => {
    const zone = geofencingService.checkCurrentZone(location);
    setCurrentZone(zone);
    setIsInDangerZone(!!zone);

    // Fetch nearby zones from API
    try {
      const apiZone = await geofencingApiService.checkDangerZone(
        location.latitude,
        location.longitude
      );
      if (apiZone) {
        geofencingService.addGeofence(apiZone);
      }
    } catch (error) {
      console.error('Error checking zone:', error);
    }
  };

  useEffect(() => {
    if (currentLocation) {
      checkZone(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    const zones = geofencingService.getDangerZones();
    setNearbyZones(zones);
  }, [currentZone]);

  return {
    isInDangerZone,
    currentZone,
    nearbyZones,
    checkZone,
  };
};
