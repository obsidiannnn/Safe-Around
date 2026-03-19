import { useEffect } from 'react';
import { useLocationStore } from '@/store/locationStore';
import { locationService } from '@/services/location/locationService';

export const useLocation = () => {
  const { currentLocation, isTracking, setCurrentLocation, setIsTracking } = useLocationStore();

  const startTracking = async () => {
    const hasPermission = await locationService.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const location = await locationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
    }

    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  useEffect(() => {
    if (!isTracking) return;

    const subscription = locationService.watchLocation((location) => {
      setCurrentLocation(location);
    });

    return () => subscription.remove();
  }, [isTracking]);

  return {
    currentLocation,
    isTracking,
    startTracking,
    stopTracking,
  };
};
