import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Vibration, Linking, Alert as NativeAlert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const [alertStatus, setAlertStatus] = useState<string>('active');
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [showActions, setShowActions] = useState(true);
  const [hasArrived, setHasArrived] = useState(false);
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);
  const [isUsingGoogleRoute, setIsUsingGoogleRoute] = useState(Boolean(GOOGLE_MAPS_API_KEY));
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlert = async () => {
      if (!alertId) return;

      try {
        const details = await alertService.getAlertDetails(alertId);
        setVictimLocation(details.alert.location);
        setAlertStatus(details.alert.status);
      } catch (error) {
        console.warn('Failed to load responder destination:', error);
      }
    };

    loadAlert();
  }, [alertId]);

  // Poll alert status every 3 seconds to check if it's cancelled/resolved
  useEffect(() => {
    if (!alertId) return;

    const pollAlertStatus = async () => {
      try {
        const details = await alertService.getAlertDetails(alertId);
        setAlertStatus(details.alert.status);
        
        // If alert is cancelled or resolved, close navigation screen
        if (details.alert.status === 'cancelled' || details.alert.status === 'resolved') {
          const parentNav = navigation.getParent();
          if (parentNav) {
            parentNav.navigate('Emergency', {
              screen: 'EmergencyDashboard',
            });
          } else {
            navigation.goBack();
          }
        }
      } catch (error) {
        console.warn('Failed to poll alert status:', error);
      }
    };

    const interval = setInterval(pollAlertStatus, 3000);
    return () => clearInterval(interval);
  }, [alertId, navigation]);

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

  const handleFinishHelping = () => {
    setShowActions(false);
    
    // Navigate back to Emergency tab's dashboard
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate('Emergency', {
        screen: 'EmergencyDashboard',
      });
    } else {
      // Fallback: just go back
      navigation.goBack();
    }
  };

  const handleConfirmArrival = () => {
    setArrivalConfirmed(true);
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

      {/* Alert Cancelled/Resolved Banner */}
      {(alertStatus === 'cancelled' || alertStatus === 'resolved') && (
        <View style={styles.alertClosedBanner}>
          <Icon name="info" size={24} color={colors.surface} />
          <Text style={styles.alertClosedText}>
            {alertStatus === 'cancelled' ? 'Alert was cancelled' : 'Person is safe now'}
          </Text>
        </View>
      )}

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
          <Text style={styles.arrivalText}>
            {arrivalConfirmed ? 'Support in progress. Close once help is complete.' : "You're very close!"}
          </Text>
        </View>
      )}

      <BottomSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        snapPoints={[0.25]}
        showBackdrop={false}
      >
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          {arrivalConfirmed ? (
            <>
              <View style={styles.helperStatusCard}>
                <Icon name="verified-user" size={22} color={colors.success} />
                <View style={styles.helperStatusTextContainer}>
                  <Text style={styles.helperStatusTitle}>You have arrived</Text>
                  <Text style={styles.helperStatusText}>
                    Stay with the person and close this response once the situation is handled safely.
                  </Text>
                </View>
              </View>
              <Button
                variant="primary"
                size="large"
                fullWidth
                icon="check-circle"
                onPress={handleFinishHelping}
                style={[styles.actionButton, { backgroundColor: colors.success }]}
              >
                Help Completed
              </Button>
            </>
          ) : hasArrived ? (
            <Button
              variant="primary"
              size="large"
              fullWidth
              icon="place"
              onPress={handleConfirmArrival}
              style={[styles.actionButton, { backgroundColor: colors.success }]}
            >
              I've Arrived
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
  alertClosedBanner: {
    position: 'absolute',
    top: 170,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  alertClosedText: {
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
  helperStatusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  helperStatusTextContainer: {
    flex: 1,
  },
  helperStatusTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  helperStatusText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
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
