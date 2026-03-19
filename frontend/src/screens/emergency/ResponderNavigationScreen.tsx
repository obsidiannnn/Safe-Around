import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BottomSheet, Button } from '@/components/common';
import { useLocationStore } from '@/store/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

/**
 * Navigation screen for responders heading to emergency
 * Shows route, ETA, and quick action buttons
 */
export const ResponderNavigationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const alertId = (route.params as any)?.alertId || '';
  
  const { currentLocation } = useLocationStore();
  const { calculateDistance } = useLocation();
  const { isStreaming } = useRealtimeLocation(alertId);
  const [victimLocation] = useState({ latitude: 37.78825, longitude: -122.4324 }); // Mock
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [showActions, setShowActions] = useState(true);
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        victimLocation.latitude,
        victimLocation.longitude
      );
      setDistance(dist);
      setEta(Math.ceil(dist / 1.4)); // Assuming 1.4 m/s walking speed

      // Proximity alert at 50m
      if (dist <= 50 && !hasArrived) {
        Vibration.vibrate([0, 200, 100, 200]);
        setHasArrived(true);
      }
    }
  }, [currentLocation]);

  const handleConfirmArrival = () => {
    // TODO: Notify victim of arrival
    navigation.goBack();
  };

  const handleCancelResponse = () => {
    // TODO: Show confirmation dialog
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: (currentLocation?.latitude || 0 + victimLocation.latitude) / 2,
          longitude: (currentLocation?.longitude || 0 + victimLocation.longitude) / 2,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
      >
        {currentLocation && (
          <>
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
            >
              <View style={styles.responderMarker}>
                <Icon name="directions-run" size={24} color={colors.surface} />
              </View>
            </Marker>

            <Marker coordinate={victimLocation}>
              <View style={styles.victimMarker}>
                <Icon name="warning" size={24} color={colors.surface} />
              </View>
            </Marker>

            <Polyline
              coordinates={[
                {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                },
                victimLocation,
              ]}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          </>
        )}
      </MapView>

      <View style={styles.topCard}>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceValue}>{Math.round(distance)}m</Text>
          <Text style={styles.distanceLabel}>Distance Remaining</Text>
        </View>
        <View style={styles.etaContainer}>
          <Text style={styles.etaValue}>{Math.ceil(eta / 60)} min</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>
      </View>

      {hasArrived && (
        <View style={styles.arrivalBanner}>
          <Icon name="place" size={24} color={colors.success} />
          <Text style={styles.arrivalText}>You're very close!</Text>
        </View>
      )}

      <BottomSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        snapPoints={[0.25]}
      >
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          {hasArrived ? (
            <Button
              variant="primary"
              size="large"
              fullWidth
              icon="check-circle"
              onPress={handleConfirmArrival}
              style={[styles.actionButton, { backgroundColor: colors.success }]}
            >
              Confirm Arrival
            </Button>
          ) : (
            <>
              <View style={styles.actionRow}>
                <Button
                  variant="outline"
                  size="medium"
                  icon="phone"
                  onPress={() => console.log('Call victim')}
                  style={styles.halfButton}
                >
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="medium"
                  icon="message"
                  onPress={() => console.log('Send message')}
                  style={styles.halfButton}
                >
                  Message
                </Button>
              </View>

              <Button
                variant="danger"
                size="large"
                fullWidth
                icon="phone"
                onPress={() => console.log('Call 911')}
                style={styles.actionButton}
              >
                Call 911
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="medium"
            fullWidth
            onPress={handleCancelResponse}
          >
            Cancel Response
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topCard: {
    position: 'absolute',
    top: spacing['2xl'],
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  distanceContainer: {
    flex: 1,
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.primary,
  },
  distanceLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  etaContainer: {
    flex: 1,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  etaValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.secondary,
  },
  etaLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  arrivalBanner: {
    position: 'absolute',
    top: 140,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  arrivalText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.surface,
    marginLeft: spacing.sm,
  },
  responderMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  victimMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  actionsContainer: {
    paddingVertical: spacing.lg,
  },
  actionsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
});
