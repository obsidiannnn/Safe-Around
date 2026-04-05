import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Location } from '@/types/models';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/spacing';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

interface NearbyUser {
  id: string;
  location: Location;
}

interface NearbyUsersLayerProps {
  userLocation: Location;
}

/**
 * Shows anonymous nearby active users on the map as pulsing dots.
 * Uber/Ola style — no plain Views inside MapView to avoid native crashes.
 */
export const NearbyUsersLayer: React.FC<NearbyUsersLayerProps> = ({ userLocation }) => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
  }, []);

  useEffect(() => {
    const generate = () => {
      const mockUsers: NearbyUser[] = Array.from({ length: 8 }).map((_, i) => ({
        id: `user-${i}`,
        location: {
          latitude: userLocation.latitude + (Math.random() - 0.5) * 0.012,
          longitude: userLocation.longitude + (Math.random() - 0.5) * 0.012,
        },
      }));
      setNearbyUsers(mockUsers);
    };
    generate();
    const interval = setInterval(generate, 30000);
    return () => clearInterval(interval);
  }, [userLocation]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.6 / pulse.value,
  }));

  return (
    <>
      {nearbyUsers.map((user, index) => (
        <Marker
          key={`${user.id}-${index}`}
          coordinate={{
            latitude: user.location.latitude,
            longitude: user.location.longitude,
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
