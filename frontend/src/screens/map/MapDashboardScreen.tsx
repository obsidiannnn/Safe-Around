import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showDangerAlert, setShowDangerAlert] = useState(false);

  useEffect(() => {
    startTracking();
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
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsScale
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

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.menuButton}>
          <Icon name="menu" size={24} color={colors.textPrimary} />
        </Pressable>

        <BackgroundLocationIndicator
          isActive={isTracking}
          batteryImpact="low"
          onPress={() => navigation.navigate('LocationHistory' as never)}
        />

        <Pressable style={styles.notificationButton}>
          <Icon name="notifications" size={24} color={colors.textPrimary} />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Badge variant="notification" count={notificationCount} color="red" />
            </View>
          )}
        </Pressable>
      </View>

      {/* Search bar */}
      <MapSearchBar
        onSelectLocation={(location) => {
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

      {/* Map controls */}
      <HeatmapLegend />
      <MapTypeSwitch currentType={mapType} onTypeChange={setMapType} />
      <CurrentLocationButton onPress={handleCenterLocation} />
      <EmergencySOSButton onEmergencyTrigger={handleEmergencyTrigger} />

      {/* Quick stats */}
      <Pressable
        style={styles.statsToggle}
        onPress={() => setShowStatsCard(!showStatsCard)}
      >
        <Icon name="info" size={20} color={colors.surface} />
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
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  menuButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  notificationButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  statsToggle: {
    position: 'absolute',
    bottom: 130, // Lifted slightly
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
});
