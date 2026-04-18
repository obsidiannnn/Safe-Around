import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Vibration, Linking, Alert as NativeAlert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { BottomSheet, Button } from '@/components/common';
import { VolunteerRouteOverlay } from '@/components/map/VolunteerRouteOverlay';
import { GOOGLE_MAPS_API_KEY } from '@/config/env';
import { useLocationStore } from '@/store/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { alertService } from '@/services/api/alertService';
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
  const mapRef = useRef<MapView>(null);
  
  const { currentLocation } = useLocationStore();
  const { calculateDistance } = useLocation();
  const { isStreaming } = useRealtimeLocation(alertId);
  const [victimLocation, setVictimLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [showActions, setShowActions] = useState(true);
  const [hasArrived, setHasArrived] = useState(false);
  const [isUsingGoogleRoute, setIsUsingGoogleRoute] = useState(Boolean(GOOGLE_MAPS_API_KEY));
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlert = async () => {
      if (!alertId) return;

      try {
        const details = await alertService.getAlertDetails(alertId);
        setVictimLocation(details.alert.location);
      } catch (error) {
        console.warn('Failed to load responder destination:', error);
      }
    };

    loadAlert();
  }, [alertId]);

  useEffect(() => {
    if (currentLocation && victimLocation) {
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
  }, [calculateDistance, currentLocation, hasArrived, victimLocation]);

  useEffect(() => {
    if (!currentLocation || !victimLocation) {
      return;
    }

    mapRef.current?.fitToCoordinates(
      [
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        victimLocation,
      ],
      {
        edgePadding: {
          top: 180,
          right: 60,
          bottom: 260,
          left: 60,
        },
        animated: true,
      },
    );
  }, [currentLocation, victimLocation]);

  const handleRouteReady = useCallback((result: any) => {
    setIsUsingGoogleRoute(true);
    setRouteError(null);

    if (typeof result?.distance === 'number') {
      setDistance(result.distance * 1000);
    }
    if (typeof result?.duration === 'number') {
      setEta(result.duration * 60);
    }

    if (Array.isArray(result?.coordinates) && result.coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(result.coordinates, {
        edgePadding: {
          top: 180,
          right: 60,
          bottom: 260,
          left: 60,
        },
        animated: true,
      });
    }
  }, []);

  const handleRouteError = useCallback((errorMessage: string) => {
    setIsUsingGoogleRoute(false);
    setRouteError(errorMessage);
    console.warn('Google route unavailable for responder navigation:', errorMessage);
  }, []);

  const handleConfirmArrival = () => {
    // Navigate back to Emergency tab, clearing the navigation stack
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
          },
        ],
      })
    );
    
    // Then navigate to Emergency tab specifically
    setTimeout(() => {
      (navigation as any).navigate('Main', {
        screen: 'Emergency',
        params: {
          screen: 'EmergencyDashboard',
        },
      });
    }, 100);
  };

  const handleCancelResponse = () => {
    NativeAlert.alert('Cancel response', 'If you can no longer help, please contact the requester or emergency services directly.', [
      { text: 'Keep Helping', style: 'cancel' },
      { text: 'Leave Response', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleOpenGoogleMaps = useCallback(async () => {
    if (!victimLocation) {
      NativeAlert.alert('Route unavailable', 'We could not find the person’s live destination yet.');
      return;
    }

    const destination = `${victimLocation.latitude},${victimLocation.longitude}`;
    const origin = currentLocation 
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    
    const urls = Platform.select({
      ios: [
        `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
      ],
      android: [
        `google.navigation:q=${destination}&mode=d`,
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
      ],
    }) || [];

    for (const url of urls) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        console.warn('Failed to open URL:', url, error);
      }
    }

    // Fallback to web Google Maps
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    await Linking.openURL(fallbackUrl);
  }, [currentLocation, victimLocation]);

  const distanceLabel = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)}m`;
  const etaMinutes = Math.max(1, Math.ceil(eta / 60));
  const routeStatusText = isUsingGoogleRoute
    ? 'Live route powered by Google directions'
    : routeError
    ? 'Using direct fallback path while Google directions is unavailable'
    : 'Using direct fallback path';
  const routeAndStreamingText = isStreaming
    ? `${routeStatusText} · Your live location is being shared`
    : routeStatusText;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: ((currentLocation?.latitude ?? victimLocation?.latitude ?? 0) + (victimLocation?.latitude ?? 0)) / 2,
          longitude: ((currentLocation?.longitude ?? victimLocation?.longitude ?? 0) + (victimLocation?.longitude ?? 0)) / 2,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
      >
        {currentLocation && victimLocation && (
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

            <VolunteerRouteOverlay
              origin={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              destination={victimLocation}
              onReady={handleRouteReady}
              onError={handleRouteError}
            />
          </>
        )}
      </MapView>

      <View style={styles.topCard}>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceValue}>{distanceLabel}</Text>
          <Text style={styles.distanceLabel}>Distance Remaining</Text>
        </View>
        <View style={styles.etaContainer}>
          <Text style={styles.etaValue}>{etaMinutes} min</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>
      </View>

      <View style={styles.routeStatusBadge}>
        <Icon
          name={isUsingGoogleRoute ? 'alt-route' : 'timeline'}
          size={16}
          color={isUsingGoogleRoute ? colors.success : colors.warning}
        />
        <Text style={styles.routeStatusText}>{routeAndStreamingText}</Text>
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
                  icon="directions"
                  onPress={handleOpenGoogleMaps}
                  style={styles.halfButton}
                >
                  Open Maps
                </Button>
                <Button
                  variant="outline"
                  size="medium"
                  icon="message"
                  onPress={() => (navigation as any).navigate('Chat', { alertId })}
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
                onPress={() => Linking.openURL('tel:112')}
                style={styles.actionButton}
              >
                Call 112
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
    top: 170,
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
  routeStatusBadge: {
    position: 'absolute',
    top: 108,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  routeStatusText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
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
