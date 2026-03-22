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

      {/* Map Components continue below */}
{/* Top Profile Bar */}
      <View style={[styles.profileBar, { top: insets.top + spacing.sm }]}>
        <Pressable 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <View style={styles.avatarPlaceholder}>
            <Icon name="verified-user" size={18} color={colors.secondary} />
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileTitle}>Verified Citizen</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.profileStatus}>LIVE PROTECTION</Text>
            </View>
          </View>
        </Pressable>

        <BackgroundLocationIndicator
          isActive={isTracking}
          batteryImpact="low"
          onPress={() => navigation.navigate('LocationHistory' as never)}
        />
      </View>

      <MapSearchBar
        topOffset={insets.top + 70}
        onSelectLocation={(location) => {
          setSelectedPlace(location);
          mapRef.current?.animateToRegion(
            {
              ...location.location,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }}
      />

      {/* Selected location actions */}
      {selectedPlace && (
        <View style={[styles.locationActions, { bottom: insets.bottom + 110 }]}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName} numberOfLines={1}>{selectedPlace.name}</Text>
          </View>
          <Pressable 
            style={styles.directionsButton}
            onPress={() => {
              const coords = `${selectedPlace.location.latitude},${selectedPlace.location.longitude}`;
              (navigation as any).navigate('SafeRoute', { destination: coords });
            }}
          >
            <Icon name="directions" size={20} color={colors.surface} />
            <Text style={styles.directionsButtonText}>Safe Path</Text>
          </Pressable>
          <Pressable style={styles.closeActionsButton} onPress={() => setSelectedPlace(null)}>
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Layer Controls */}
      <View style={[styles.layersButtonContainer, { top: insets.top + 130 }]}>
        <Pressable 
          style={[styles.layersFAB, showMapTypeMenu && styles.layersFABActive]} 
          onPress={() => setShowMapTypeMenu(!showMapTypeMenu)}
        >
          <Icon name="layers" size={24} color={showMapTypeMenu ? colors.surface : colors.textPrimary} />
        </Pressable>
        
        {showMapTypeMenu && (
          <View style={styles.mapTypeMenuContainer}>
            <MapTypeSwitch 
              currentType={mapType} 
              onTypeChange={(type) => {
                setMapType(type);
                setShowMapTypeMenu(false);
              }} 
            />
          </View>
        )}
      </View>

      <CurrentLocationButton 
        onPress={handleCenterLocation} 
        style={{ bottom: insets.bottom + 180 }}
      />
      
      <EmergencySOSButton 
        onEmergencyTrigger={handleEmergencyTrigger} 
      />

      <Pressable
        style={[styles.statsFAB, { bottom: insets.bottom + 250 }]}
        onPress={() => setShowStatsCard(!showStatsCard)}
      >
        <Icon name="insights" size={24} color={colors.surface} />
      </Pressable>

      <QuickStatsCard
        visible={showStatsCard}
        onClose={() => setShowStatsCard(false)}
        stats={currentStats}
        onViewCrimeHistory={() => console.log('View crime history')}
        onPlanSafeRoute={() => navigation.navigate('SafeRoute' as never)}
        onReportIncident={() => console.log('Report incident')}
      />

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
  profileBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileStatus: {
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    marginRight: 4,
  },
  layersButtonContainer: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 5,
  },
  layersFAB: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layersFABActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mapTypeMenuContainer: {
    position: 'absolute',
    top: 56,
    right: 0,
    width: 120,
    zIndex: 10,
  },
  statsFAB: {
    position: 'absolute',
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    zIndex: 10,
  },
  locationActions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.premium,
    zIndex: 15,
  },
  locationInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  directionsButtonText: {
    color: colors.surface,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  closeActionsButton: {
    padding: spacing.xs,
  },
});
