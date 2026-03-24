import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Text, Alert } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import CrimeWebSocketService from '@/services/websocket/CrimeWebSocket';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeatmapLayer } from '@/components/map/HeatmapLayer';
import { UserLocationMarker } from '@/components/map/UserLocationMarker';
import { DangerZoneMarker } from '@/components/map/DangerZoneMarker';
import { CurrentLocationButton } from '@/components/map/CurrentLocationButton';
import { EmergencySOSButton } from '@/components/map/EmergencySOSButton';
import { QuickStatsCard } from '@/components/map/QuickStatsCard';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { MapTypeSwitch } from '@/components/map/MapTypeSwitch';
import { NearbyUsersLayer } from '@/components/map/NearbyUsersLayer';
import { DangerZoneAlert } from '@/components/location/DangerZoneAlert';
import { BackgroundLocationIndicator } from '@/components/location/BackgroundLocationIndicator';
import { useMapStore } from '@/store/mapStore';
import { useLocation } from '@/hooks/useLocation';
import { useGeofencing } from '@/hooks/useGeofencing';
import { heatmapService } from '@/services/api/heatmapService';
import { DangerZone } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { useNavigation } from '@react-navigation/native';
import CrimeHeatmapOverlay from '@/components/map/CrimeHeatmapOverlay';
import { useAlertStore } from '@/store/alertStore';
import { VolunteerRouteOverlay } from '@/components/map/VolunteerRouteOverlay';

export const MapDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { currentLocation, startTracking, isTracking } = useLocation();
  const { mapType, setMapType, currentStats, setCurrentStats } = useMapStore();
  const { isInDangerZone, currentZone } = useGeofencing();
  
  // ── Default to India (New Delhi) instead of San Francisco ──────────────────
  const [region, setRegion] = useState<Region>({
    latitude: currentLocation?.latitude || 28.6139,
    longitude: currentLocation?.longitude || 77.2090,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false);
  const [heatmapKey, setHeatmapKey] = useState(0);
  const [showDangerAlert, setShowDangerAlert] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; location: { latitude: number; longitude: number } } | null>(null);
  const [activeVictimLocation, setActiveVictimLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapBounds, setMapBounds] = useState({
    north: 0,
    south: 0,
    east: 0,
    west: 0,
  });

  useEffect(() => {
    startTracking();
    // Load heatmap data immediately on mount with India center (Delhi)
    // so the map shows crime data even before user location is acquired
    const initLat = currentLocation?.latitude || 28.6139;
    const initLng = currentLocation?.longitude || 77.2090;
    fetchAreaStats(initLat, initLng);
  }, []);

  useEffect(() => {
    if (isInDangerZone && currentZone) {
      setShowDangerAlert(true);
    }
  }, [isInDangerZone, currentZone]);

  useEffect(() => {
    if (currentLocation) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      fetchAreaStats(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation]);

  // Connect to Real-time Crime WebSocket Hub
  useEffect(() => {
    // Use WS_URL from env (set in .env.development) — backend is on port 8000
    const WS_URL = `${process.env.EXPO_PUBLIC_WS_URL || process.env.WS_URL || 'ws://localhost:8000'}/ws/crime`;
    CrimeWebSocketService.connect(WS_URL);

    // Listen for new crimes
    const handleNewCrime = (data: any) => {
      Alert.alert(
        '🚨 Crime Alert',
        `${data.crime_type} reported nearby`,
        [
          { text: 'View', onPress: () => {
            // Pan map to crime location
            mapRef.current?.animateToRegion({
              latitude: data.lat,
              longitude: data.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }},
          { text: 'Dismiss' }
        ]
      );

      // Force refresh of heatmap by incrementing key
      setHeatmapKey(prev => prev + 1);
    };

    CrimeWebSocketService.on('crime_added', handleNewCrime);

    return () => {
      CrimeWebSocketService.off('crime_added', handleNewCrime);
      CrimeWebSocketService.disconnect();
    };
  }, []);

  const fetchAreaStats = async (lat: number, lng: number) => {
    try {
      const stats = await heatmapService.getStatistics(lat, lng);
      setCurrentStats(stats);
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
    
    // Calculate map bounds for HeatmapOverlay
    const bounds = {
      north: newRegion.latitude + newRegion.latitudeDelta / 2,
      south: newRegion.latitude - newRegion.latitudeDelta / 2,
      east: newRegion.longitude + newRegion.longitudeDelta / 2,
      west: newRegion.longitude - newRegion.longitudeDelta / 2,
    };
    setMapBounds(bounds);

    fetchAreaStats(newRegion.latitude, newRegion.longitude);
  };

  const handleCenterLocation = () => {
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const { createAlert, respondToAlert, activeAlert, respondersCount } = useAlertStore();

  // Connect to Real-time Crime WebSocket Hub
  useEffect(() => {
    // Use WS_URL from env (set in .env.development) — backend is on port 8000
    const WS_URL = `${process.env.EXPO_PUBLIC_WS_URL || process.env.WS_URL || 'ws://localhost:8000'}/ws/crime`;
    CrimeWebSocketService.connect(WS_URL);

    // Listen for new crimes
    const handleNewCrime = (data: any) => {
      Alert.alert(
        '🚨 Crime Alert',
        `${data.crime_type} reported nearby`,
        [
          { text: 'View', onPress: () => {
            mapRef.current?.animateToRegion({
              latitude: data.lat,
              longitude: data.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }},
          { text: 'Dismiss' }
        ]
      );
      setHeatmapKey(prev => prev + 1);
    };

    // Listen for help requests (Volunteers)
    const handleEmergencyAlert = (data: any) => {
      // Don't show if it's our own alert
      if (data.user?.user_id === useAuthStore.getState().user?.id) return;

      Alert.alert(
        '🆘 HELP NEEDED',
        `A person is in danger nearby. Can you help?`,
        [
          { 
            text: 'I AM COMING', 
            onPress: () => {
              setActiveVictimLocation(data.location);
              respondToAlert(data.alert_id);
            },
            style: 'default' 
          },
          { text: 'I Can\'t Help', style: 'cancel' }
        ]
      );
    };

    // Listen for responders (Victim)
    const handleResponderAccepted = (data: any) => {
      Alert.alert(
        '✅ Help is on the way!',
        `A volunteer is ${Math.round(data.distance)}m away and will arrive in approx ${data.eta} min.`
      );
    };

    CrimeWebSocketService.on('crime_added', handleNewCrime);
    CrimeWebSocketService.on('emergency_alert', handleEmergencyAlert);
    CrimeWebSocketService.on('responder_accepted', handleResponderAccepted);

    return () => {
      CrimeWebSocketService.off('crime_added', handleNewCrime);
      CrimeWebSocketService.off('emergency_alert', handleEmergencyAlert);
      CrimeWebSocketService.off('responder_accepted', handleResponderAccepted);
      CrimeWebSocketService.disconnect();
    };
  }, [currentLocation]);

  const handleEmergencyTrigger = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Cannot get your current location.');
      return;
    }

    try {
      await createAlert({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }, false);
      Alert.alert('SOS Sent', 'Help request has been sent to nearby volunteers and emergency contacts.');
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger SOS alert.');
    }
  };

  const handleDangerZonePress = (zone: DangerZone) => {
    console.log('Danger zone pressed:', zone);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType={mapType}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        onPress={() => setShowMapTypeMenu(false)}
      >
        {/* native Heatmap Overlay */}
        <CrimeHeatmapOverlay
          key={`heatmap-${heatmapKey}`}
          mapRef={mapRef as React.RefObject<MapView>}
          bounds={mapBounds}
          onCrimeDataLoaded={(count) => {
            console.log(`Loaded ${count} crime points`);
          }}
        />
        
        {currentLocation && (
          <>
            <UserLocationMarker location={currentLocation} />
            <NearbyUsersLayer userLocation={currentLocation} />
          </>
        )}

        {currentLocation && activeVictimLocation && (
          <VolunteerRouteOverlay
            origin={currentLocation}
            destination={activeVictimLocation}
            onReady={(result) => {
              console.log(`Route ready: ${result.distance} km, ${result.duration} min`);
            }}
          />
        )}

        {dangerZones.map((zone) => (
          <DangerZoneMarker
            key={zone.id}
            zone={zone}
            onPress={handleDangerZonePress}
          />
        ))}
      </MapView>

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { top: insets.top + spacing.md }]}>
        <View style={styles.logoContainer}>
          <Icon name="shield" size={24} color={colors.secondary} />
          <Text style={styles.logoText}>SafeAround</Text>
        </View>
        
        <Pressable 
          style={styles.menuButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Icon name="menu" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Safe Route Card at Bottom */}
      {currentStats && (
        <View style={[styles.safeRouteCard, { bottom: insets.bottom + 80 }]}>
          <View style={styles.routeIconContainer}>
            <Icon name="route" size={24} color={colors.success} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeTitle}>Safer route via Main St</Text>
            <Text style={styles.routeSubtitle}>+2 mins • Well lit & active</Text>
          </View>
          <Pressable 
            style={styles.shieldButton}
            onPress={() => navigation.navigate('SafeRoute' as never)}
          >
            <Icon name="shield" size={20} color={colors.secondary} />
          </Pressable>
        </View>
      )}

      {/* Center Location Button */}
      <Pressable 
        style={[styles.centerLocationButton, { bottom: insets.bottom + 180 }]}
        onPress={handleCenterLocation}
      >
        <Icon name="my-location" size={24} color={colors.secondary} />
      </Pressable>
      
      {/* Emergency SOS Button */}
      <Pressable 
        style={[styles.sosButton, { bottom: insets.bottom + 100 }]}
        onLongPress={handleEmergencyTrigger}
        delayLongPress={500}
      >
        <Icon name="wifi-tethering" size={32} color={colors.surface} />
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>

      {currentZone && (
        <DangerZoneAlert
          visible={showDangerAlert}
          zone={currentZone}
          onDismiss={() => setShowDangerAlert(false)}
          onEnableSafeRoute={() => {
            setShowDangerAlert(false);
            navigation.navigate('SafeRoute' as never);
          }}
          onAlertContacts={() => {
            setShowDangerAlert(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.medium,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeRouteCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.premium,
    zIndex: 5,
  },
  routeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  shieldButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLocationButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    zIndex: 5,
  },
  sosButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.premium,
    zIndex: 5,
  },
  sosText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
    marginTop: 2,
  },
});
