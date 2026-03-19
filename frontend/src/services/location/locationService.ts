import * as ExpoLocation from 'expo-location';
import { Location } from '@/types/models';

export const locationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  requestBackgroundPermissions: async (): Promise<boolean> => {
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  getCurrentLocation: async (): Promise<Location | null> => {
    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        heading: location.coords.heading || undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  watchLocation: (callback: (location: Location) => void): { remove: () => void } => {
    let subscription: ExpoLocation.LocationSubscription;

    ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
          heading: location.coords.heading || undefined,
          timestamp: location.timestamp,
        });
      }
    ).then((sub) => {
      subscription = sub;
    });

    return {
      remove: () => subscription?.remove(),
    };
  },

  getAddressFromCoordinates: async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      const addresses = await ExpoLocation.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (addresses.length > 0) {
        const addr = addresses[0];
        return `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`.trim();
      }
      
      return 'Unknown location';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Unknown location';
    }
  },
};
