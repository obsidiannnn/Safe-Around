import * as ExpoLocation from 'expo-location';
import { Location } from '@/types/models';

/**
 * Singleton service for location management
 * Handles foreground and background location tracking
 */
class LocationService {
  private static instance: LocationService;
  private subscription: ExpoLocation.LocationSubscription | null = null;
  private isTracking = false;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async requestBackgroundPermissions(): Promise<boolean> {
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    return status === 'granted';
  }

  async startTracking(
    callback: (location: Location) => void,
    options?: {
      accuracy?: ExpoLocation.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): Promise<void> {
    if (this.isTracking) return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const {
      accuracy = ExpoLocation.Accuracy.High,
      timeInterval = 30000,
      distanceInterval = 10,
    } = options || {};

    // Battery optimization: reduce frequency if battery low
    const batteryLevel = await this.getBatteryLevel();
    const adjustedTimeInterval = batteryLevel < 0.2 ? timeInterval * 2 : timeInterval;

    this.subscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy,
        timeInterval: adjustedTimeInterval,
        distanceInterval,
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
    );

    this.isTracking = true;
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      // Placeholder - would use expo-battery in production
      return 1.0;
    } catch {
      return 1.0;
    }
  }

  async stopTracking(): Promise<void> {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
  }

  async getCurrentLocation(): Promise<Location | null> {
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
  }

  watchPosition(
    callback: (location: Location) => void,
    options?: {
      accuracy?: ExpoLocation.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): { remove: () => void } {
    let subscription: ExpoLocation.LocationSubscription;

    const {
      accuracy = ExpoLocation.Accuracy.High,
      timeInterval = 5000,
      distanceInterval = 10,
    } = options || {};

    ExpoLocation.watchPositionAsync(
      {
        accuracy,
        timeInterval,
        distanceInterval,
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
    }).catch((error) => {
      console.warn('Location watch could not start right now:', error);
    });

    return {
      remove: () => subscription?.remove(),
    };
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  isInDangerZone(
    location: Location,
    dangerZones: Array<{ location: Location; radius: number }>
  ): boolean {
    return dangerZones.some((zone) => {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        zone.location.latitude,
        zone.location.longitude
      );
      return distance <= zone.radius;
    });
  }

  async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string> {
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
  }
}

export const locationService = LocationService.getInstance();
