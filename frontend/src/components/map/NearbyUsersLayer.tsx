import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Location } from '@/types/models';
import { colors } from '@/theme/colors';
import { locationApiService, NearbyUserLocation } from '@/services/api/locationApiService';
import { useAuthStore } from '@/store/authStore';
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

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchNearbyUsers = async () => {
      const users = await locationApiService.getNearbyUsers(userLocation, 5000);
      const filteredUsers = currentUserId
        ? users.filter((user) => String(user.userId) !== String(currentUserId))
        : users;
      if (cancelled) return;
      setNearbyUsers(filteredUsers);
      onUsersChange?.(filteredUsers.length);
    };

    fetchNearbyUsers();
    const interval = setInterval(fetchNearbyUsers, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, userLocation.latitude, userLocation.longitude, onUsersChange]);

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
