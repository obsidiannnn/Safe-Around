import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useLocationStore } from '@/store/locationStore';
import { Location } from '@/types/models';

/**
 * Hook for streaming location updates via WebSocket
 * Throttles updates to max 1 per second
 */
export const useRealtimeLocation = (alertId: string | null) => {
  const { send, isConnected } = useWebSocket();
  const { currentLocation } = useLocationStore();
  const lastSentRef = useRef<number>(0);
  const throttleMs = 1000;

  useEffect(() => {
    if (!alertId || !isConnected || !currentLocation) return;

    const now = Date.now();
    if (now - lastSentRef.current < throttleMs) return;

    send('location_update', {
      alert_id: alertId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      accuracy: currentLocation.accuracy,
      heading: currentLocation.heading,
      timestamp: currentLocation.timestamp || now,
    });

    lastSentRef.current = now;
  }, [currentLocation, alertId, isConnected, send]);

  return { isStreaming: !!alertId && isConnected };
};
