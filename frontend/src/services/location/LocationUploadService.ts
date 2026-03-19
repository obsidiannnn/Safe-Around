import { Location } from '@/types/models';
import { geofencingApiService } from '@/services/api/geofencingService';
import NetInfo from '@react-native-community/netinfo';

/**
 * Service for batching and uploading location data
 * Handles offline queueing and retry logic
 */
class LocationUploadService {
  private static instance: LocationUploadService;
  private queue: Location[] = [];
  private uploadInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private readonly BATCH_SIZE = 10;
  private readonly UPLOAD_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.setupNetworkListener();
  }

  static getInstance(): LocationUploadService {
    if (!LocationUploadService.instance) {
      LocationUploadService.instance = new LocationUploadService();
    }
    return LocationUploadService.instance;
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      // If coming back online, upload queued locations
      if (wasOffline && this.isOnline && this.queue.length > 0) {
        this.uploadBatch();
      }
    });
  }

  startUploading(): void {
    if (this.uploadInterval) return;

    this.uploadInterval = setInterval(() => {
      if (this.queue.length >= this.BATCH_SIZE || this.queue.length > 0) {
        this.uploadBatch();
      }
    }, this.UPLOAD_INTERVAL);
  }

  stopUploading(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    // Upload remaining locations
    if (this.queue.length > 0) {
      this.uploadBatch();
    }
  }

  addLocation(location: Location): void {
    this.queue.push(location);

    // Upload immediately if batch size reached
    if (this.queue.length >= this.BATCH_SIZE) {
      this.uploadBatch();
    }
  }

  private async uploadBatch(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.BATCH_SIZE);

    try {
      // Upload most recent location (compressed approach)
      const latestLocation = batch[batch.length - 1];
      await geofencingApiService.updateUserLocation(latestLocation);
    } catch (error) {
      console.error('Error uploading locations:', error);
      // Re-queue failed locations
      this.queue.unshift(...batch);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
  }
}

export const locationUploadService = LocationUploadService.getInstance();
