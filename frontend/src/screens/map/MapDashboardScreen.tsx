import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeatmapLayer } from '@/components/map/HeatmapLayer';
import { HeatmapLegend } from '@/components/map/HeatmapLegend';
import { UserLocationMarker } from '@/components/map/UserLocationMarker';
import { DangerZoneMarker } from '@/components/map/DangerZoneMarker';
import { CurrentLocationButton } from '@/components/map/CurrentLocationButton';
import { EmergencySOSButton } from '@/components/map/EmergencySOSButton';
import { QuickStatsCard } from '@/components/map/QuickStatsCard';
import { MapSearchBar } from '@/components/map/MapSearchBar';
import { MapTypeSwitch } from '@/components/map/MapTypeSwitch';
import { NearbyUsersLayer } from '@/components/map/NearbyUsersLayer';
import { Badge } from '@/components/common';
import { DangerZoneAlert } from '@/components/location/DangerZoneAlert';
import { BackgroundLocationIndicator } from '@/components/location/BackgroundLocationIndicator';
import { useLocationStore } from '@/store/locationStore';
import { useMapStore } from '@/store/mapStore';
import { useLocation } from '@/hooks/useLocation';
import { useGeofencing } from '@/hooks/useGeofencing';
import { heatmapService } from '@/services/api/heatmapService';
import { DangerZone, AreaStats } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { useNavigation } from '@react-navigation/native';

/**
 * Main map dashboard screen with crime heatmap
 * Shows user location, danger zones, and area statistics
 */
export const MapDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { currentLocation, startTracking, isTracking } = useLocation();
  const { mapType, setMapType, currentStats, setCurrentStats } = useMapStore();
  const { isInDangerZone, currentZone } = useGeofencing();
  
  const [region, setRegion] = useState<Region>({
    latitude: currentLocation?.latitude || 37.78825,
    longitude: currentLocation?.longitude || -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showDangerAlert, setShowDangerAlert] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; location: { latitude: number; longitude: number } } | null>(null);

  useEffect(() => {
    startTracking();
  }, []);

  useEffect(() => {
    if (isInDangerZone && currentZone) {
      console.log('User entered danger zone:', currentZone.id);
      setShowDangerAlert(true);
    }
  }, [isInDangerZone, currentZone]);

  useEffect(() => {
    if (currentLocation) {
      console.log('Centering map on current location:', currentLocation.latitude, currentLocation.longitude);
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
    fetchAreaStats(newRegion.latitude, newRegion.longitude);
  };

  const handleCenterLocation = () => {
    if (currentLocation) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  };

  const handleEmergencyTrigger = () => {
    // TODO: Trigger emergency alert
    console.log('Emergency SOS triggered!');
  };

  const handleDangerZonePress = (zone: DangerZone) => {
    // TODO: Show danger zone details in bottom sheet
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
      >
        <HeatmapLayer region={region} />
        
        {currentLocation && (
          <>
            <UserLocationMarker location={currentLocation} />
            <NearbyUsersLayer userLocation={currentLocation} />
          </>
        )}

        {dangerZones.map((zone) => (
          <DangerZoneMarker
            key={zone.id}
            zone={zone}
            onPress={handleDangerZonePress}
          />
        ))}
      </MapView>

      {/* Top Profile Bar (Psychological: Sense of being protected/logged in) */}
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

      {/* Layer Controls - Unified into a single floating button for clarity */}
      <View style={[styles.layersButtonContainer, { top: insets.top + 130 }]}>
        <Pressable style={styles.layersFAB}>
          <Icon name="layers" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <CurrentLocationButton 
        onPress={handleCenterLocation} 
        style={{ bottom: insets.bottom + 180 }}
      />
      
      <EmergencySOSButton 
        onEmergencyTrigger={handleEmergencyTrigger} 
      />

      {/* Quick stats floating button */}
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

      {/* Danger zone alert */}
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
            // TODO: Alert emergency contacts
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
