import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Location } from '@/types/models';
import { colors } from '@/theme/colors';
import { locationApiService, NearbyUserLocation } from '@/services/api/locationApiService';
import { useAuthStore } from '@/store/authStore';
import CrimeWebSocketService from '@/services/websocket/CrimeWebSocket';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

interface NearbyUsersLayerProps {
  userLocation: Location;
  onUsersChange?: (count: number) => void;
}

/**
 * Shows anonymous nearby active users on the map as pulsing dots.
 * Uber/Ola style — no plain Views inside MapView to avoid native crashes.
 */
export const NearbyUsersLayer: React.FC<NearbyUsersLayerProps> = ({ userLocation, onUsersChange }) => {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUserLocation[]>([]);
  const pulse = useSharedValue(1);
  const lastFetchAtRef = useRef(0);
  const latestLocationRef = useRef(userLocation);
  const lastFetchCenterRef = useRef<Location | null>(null);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
  }, []);

  const fetchNearbyUsers = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchAtRef.current < 4000) {
      return;
    }
    lastFetchAtRef.current = now;

    const users = await locationApiService.getNearbyUsers(latestLocationRef.current, 5000, force);
    const filteredUsers = currentUserId
      ? users.filter((user) => String(user.userId) !== String(currentUserId))
      : users;

    setNearbyUsers(filteredUsers);
    onUsersChange?.(filteredUsers.length);
    lastFetchCenterRef.current = latestLocationRef.current;
  }, [currentUserId, onUsersChange]);

  useEffect(() => {
    latestLocationRef.current = userLocation;

    const previousFetchCenter = lastFetchCenterRef.current;
    if (!previousFetchCenter || getDistanceMeters(previousFetchCenter, userLocation) >= 150) {
      fetchNearbyUsers(true);
    }
  }, [fetchNearbyUsers, userLocation]);

  useEffect(() => {
    const handleNearbyUsersUpdated = (event?: { latitude?: number; longitude?: number }) => {
      const changedLocation = event?.latitude != null && event?.longitude != null
        ? { latitude: event.latitude, longitude: event.longitude }
        : null;

      if (
        changedLocation &&
        getDistanceMeters(latestLocationRef.current, changedLocation) > 6000
      ) {
        return;
      }

      fetchNearbyUsers(true);
    };

    fetchNearbyUsers(true);
    CrimeWebSocketService.on('nearby_users_updated', handleNearbyUsersUpdated);
    const interval = setInterval(() => fetchNearbyUsers(true), 20000);
    return () => {
      CrimeWebSocketService.off('nearby_users_updated', handleNearbyUsersUpdated);
      clearInterval(interval);
    };
  }, [fetchNearbyUsers]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.6 / pulse.value,
  }));

  return (
    <>
      {nearbyUsers.map((user) => (
        <Marker
          key={user.userId}
          coordinate={{
            latitude: user.latitude,
            longitude: user.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.markerContainer}>
            <Animated.View style={[styles.pulse, animatedPulseStyle]} />
            <View style={styles.userDot} />
          </View>
        </Marker>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});

function getDistanceMeters(
  origin: Pick<Location, 'latitude' | 'longitude'>,
  destination: Pick<Location, 'latitude' | 'longitude'>
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
