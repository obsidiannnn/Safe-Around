import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Location } from '@/types/models';
import { colors } from '@/theme/colors';

interface UserLocationMarkerProps {
  location: Location;
}

/**
 * Animated user location marker with pulsing effect
 * Shows accuracy circle and direction indicator
 */
export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ location }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.3, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      {/* Accuracy circle */}
      {location.accuracy && (
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={location.accuracy}
          fillColor="rgba(25, 118, 210, 0.1)"
          strokeColor="rgba(25, 118, 210, 0.3)"
          strokeWidth={1}
        />
      )}

      {/* User location marker */}
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        flat
        rotation={location.heading || 0}
      >
        <View style={styles.container}>
          <Animated.View style={[styles.pulse, animatedStyle]} />
          <View style={styles.dot} />
          {location.heading !== undefined && (
            <View style={styles.directionIndicator} />
          )}
        </View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    opacity: 0.3,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  directionIndicator: {
    position: 'absolute',
    top: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.secondary,
  },
});
