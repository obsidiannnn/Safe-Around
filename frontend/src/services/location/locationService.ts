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
};
