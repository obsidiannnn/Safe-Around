import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Location } from '@/types/models';
import { theme } from '@/theme';

interface LocationUpdate {
  user_id: string;
  user_role: 'victim' | 'responder';
  location: Location;
  distance_to_alert: number;
  eta: number;
}

interface LiveLocationTrackerProps {
  alertId: string;
  victimLocation: Location;
}

export const LiveLocationTracker: React.FC<LiveLocationTrackerProps> = ({
  alertId,
  victimLocation,
}) => {
  const { subscribe, unsubscribe } = useWebSocket();
  const [responders, setResponders] = useState<LocationUpdate[]>([]);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const handleLocationUpdate = (data: LocationUpdate) => {
      if (data.user_role === 'responder') {
        setResponders((prev) => {
          const index = prev.findIndex((r) => r.user_id === data.user_id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = data;
            return updated;
          }
          return [...prev, data];
        });
      }
    };

    subscribe('location_broadcast', handleLocationUpdate);

    return () => {
      unsubscribe('location_broadcast', handleLocationUpdate);
    };
  }, [subscribe, unsubscribe]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <>
      <Marker coordinate={victimLocation} pinColor={theme.colors.error}>
        <Animated.View style={[styles.victimMarker, pulseStyle]} />
      </Marker>

      {responders.map((responder) => (
        <React.Fragment key={responder.user_id}>
          <Marker
            coordinate={responder.location}
            pinColor={theme.colors.secondary}
          >
            <View style={styles.responderMarker}>
              <Text style={styles.etaText}>{responder.eta} min</Text>
            </View>
          </Marker>
          <Polyline
            coordinates={[victimLocation, responder.location]}
            strokeColor={theme.colors.secondary}
            strokeWidth={2}
            lineDashPattern={[5, 5]}
          />
        </React.Fragment>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  victimMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
  },
  responderMarker: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.sm,
  },
  etaText: {
    fontSize: theme.typography.sizes.xs,
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
  },
});
