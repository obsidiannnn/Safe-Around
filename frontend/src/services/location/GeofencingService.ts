import * as TaskManager from 'expo-task-manager';
import * as ExpoLocation from 'expo-location';
import { DangerZone, Location } from '@/types/models';
import { locationService } from './locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_TASK = 'background-geofence-task';
const CACHED_ZONES_KEY = 'cached_danger_zones';

type GeofenceCallback = (zone: DangerZone) => void;

/**
 * Geofencing service for monitoring danger zone entries/exits
 * Triggers callbacks when entering or exiting danger zones
 * Supports offline mode with cached zones
 */
class GeofencingService {
  private static instance: GeofencingService;
  private dangerZones: DangerZone[] = [];
  private currentZone: DangerZone | null = null;
  private onEnterCallbacks: GeofenceCallback[] = [];
  private onExitCallbacks: GeofenceCallback[] = [];
  private onWarningCallbacks: GeofenceCallback[] = [];
  private isMonitoring = false;

  private constructor() {
    this.loadCachedZones();
  }

  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  private async loadCachedZones(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CACHED_ZONES_KEY);
      if (cached) {
        this.dangerZones = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading cached zones:', error);
    }
  }

  private async saveCachedZones(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHED_ZONES_KEY, JSON.stringify(this.dangerZones));
    } catch (error) {
      console.error('Error saving cached zones:', error);
    }
  }

  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  async startGeofenceMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    const hasPermission = await locationService.requestBackgroundPermissions();
    if (!hasPermission) {
      throw new Error('Background location permission required for geofencing');
    }

    this.isMonitoring = true;
  }

  stopGeofenceMonitoring(): void {
    this.isMonitoring = false;
  }

  addGeofence(zone: DangerZone): void {
    const exists = this.dangerZones.find((z) => z.id === zone.id);
    if (!exists) {
      this.dangerZones.push(zone);
      this.saveCachedZones();
    }
  }

  removeGeofence(id: string): void {
    this.dangerZones = this.dangerZones.filter((z) => z.id !== id);
    this.saveCachedZones();
  }

  clearGeofences(): void {
    this.dangerZones = [];
    this.saveCachedZones();
  }

  checkCurrentZone(location: Location): DangerZone | null {
    for (const zone of this.dangerZones) {
      const distance = locationService.calculateDistance(
        location.latitude,
        location.longitude,
        zone.location.latitude,
        zone.location.longitude
      );

      // Check if within danger zone
      if (distance <= zone.radius) {
        if (!this.currentZone || this.currentZone.id !== zone.id) {
          this.currentZone = zone;
          this.triggerEnterCallbacks(zone);
        }
        return zone;
      }

      // Check if approaching (within 500m)
      if (distance <= zone.radius + 500 && distance > zone.radius) {
        this.triggerWarningCallbacks(zone);
      }
    }

    // Check if exited zone
    if (this.currentZone) {
      const distance = locationService.calculateDistance(
        location.latitude,
        location.longitude,
        this.currentZone.location.latitude,
        this.currentZone.location.longitude
      );

      if (distance > this.currentZone.radius) {
        this.triggerExitCallbacks(this.currentZone);
        this.currentZone = null;
      }
    }

    return null;
  }

  onEnterDangerZone(callback: GeofenceCallback): void {
    this.onEnterCallbacks.push(callback);
  }

  onExitDangerZone(callback: GeofenceCallback): void {
    this.onExitCallbacks.push(callback);
  }

  onZoneWarning(callback: GeofenceCallback): void {
    this.onWarningCallbacks.push(callback);
  }

  private triggerEnterCallbacks(zone: DangerZone): void {
    this.onEnterCallbacks.forEach((callback) => callback(zone));
  }

  private triggerExitCallbacks(zone: DangerZone): void {
    this.onExitCallbacks.forEach((callback) => callback(zone));
  }

  private triggerWarningCallbacks(zone: DangerZone): void {
    this.onWarningCallbacks.forEach((callback) => callback(zone));
  }

  getDangerZones(): DangerZone[] {
    return this.dangerZones;
  }

  getCurrentZone(): DangerZone | null {
    return this.currentZone;
  }
}

export const geofencingService = GeofencingService.getInstance();
