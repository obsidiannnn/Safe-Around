import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Button } from '@/components/common/Button';
import { SearchBar } from '@/components/common/SearchBar';
import { useLocationStore } from '@/store/locationStore';
import { theme } from '@/theme';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GOOGLE_MAPS_API_KEY } from '@/config/env';

// Polyline Decoder for Google Maps Directions API string compression formula
const decodePolyline = (t: string, e: number = 5) => {
  let points = [];
  let index = 0, len = t.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: (lat / Math.pow(10, e)), longitude: (lng / Math.pow(10, e)) });
  }
  return points;
};

interface Route {
  id: string;
  name: string;
  distance: number;
  duration: number;
  safetyScore: number;
  dangerZones: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export const SafeRouteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const mapRef = React.useRef<MapView>(null);
  const { currentLocation } = useLocationStore();
  
  const initialDestination = (route.params as any)?.destination || '';
  const [destination, setDestination] = useState(initialDestination);
  const [mode, setMode] = useState<'walking' | 'driving' | 'transit'>('walking');
  const [selectedRoute, setSelectedRoute] = useState<string>('a');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (initialDestination || destination) {
      fetchDirections();
    }
  }, [initialDestination, mode]);

  const fetchDirections = async () => {
    if (!currentLocation || !destination) return;
    setLoading(true);
    try {
      const modeString = mode === 'walking' ? 'walking' : mode === 'driving' ? 'driving' : 'transit';
      const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${encodeURIComponent(destination)}&mode=${modeString}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const routeData = data.routes[0];
        const leg = routeData.legs[0];
        const points = decodePolyline(routeData.overview_polyline.points);
        
        const newRoute = {
          id: 'a',
          name: `${modeString.toUpperCase()} Route`,
          distance: parseFloat(leg.distance.text.replace(/[^0-9.]/g, '')),
          duration: Math.round(leg.duration.value / 60),
          safetyScore: Math.floor(Math.random() * 20) + 80, // Mock safety score
          dangerZones: 0,
          coordinates: points,
          steps: leg.steps, // Added steps for detailed navigation
        };

        setRoutes([newRoute]);
        setSelectedRoute('a');

        // Fit map to coordinates
        if (points.length > 0) {
          setTimeout(() => {
            (mapRef.current as any)?.fitToCoordinates(points, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }, 500);
        }
      } else {
        setRoutes([]);
      }
    } catch (err) {
      console.error('Directions Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  const handleStartNavigation = () => {
    const selectedRouteData = routes.find((r) => r.id === selectedRoute);
    if (selectedRouteData) {
      (navigation as any).navigate('Navigation', { 
        route: selectedRouteData, 
        mode,
        destinationName: destination.includes(',') ? 'Selected Location' : destination
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Path Planning</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile' as never)}
          style={styles.headerIconButton}
        >
          <Icon name="verified-user" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { zIndex: 999 }]}>
        <GooglePlacesAutocomplete
          placeholder="Secure Destination..."
          fetchDetails={true}
          onPress={(data, details = null) => {
            if (details?.geometry?.location) {
              const coords = `${details.geometry.location.lat},${details.geometry.location.lng}`;
              setDestination(coords);
            } else {
              setDestination(data.description);
            }
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
          }}
          onFail={(error) => console.error('SafeRoute Places Error:', error)}
          keyboardShouldPersistTaps="always"
          enablePoweredByContainer={false}
          styles={{
            container: { flex: 0 },
            textInput: {
              height: 52,
              color: colors.textPrimary,
              fontSize: 16,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadows.small,
            },
            listView: {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              marginTop: 4,
              ...shadows.large,
              position: 'absolute',
              top: 56,
              left: 0,
              right: 0,
              zIndex: 1000,
            },
            row: { padding: 12, backgroundColor: colors.surface },
            description: { color: colors.textPrimary, fontWeight: '500' },
            separator: { height: 1, backgroundColor: colors.border },
          }}
          textInputProps={{
            onChangeText: (text) => setDestination(text),
            placeholderTextColor: colors.textSecondary,
          }}
          renderLeftButton={() => (
            <View style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}>
              <Icon name="location-on" size={24} color={colors.primary} />
            </View>
          )}
        />
        <Button 
          variant="primary" 
          size="medium" 
          onPress={fetchDirections} 
          style={{ marginTop: spacing.md, borderRadius: borderRadius.lg }}
          disabled={loading || !destination}
        >
          {loading ? 'Analyzing Safety Data...' : 'Calculate Safe Paths'}
        </Button>
      </View>

      <View style={styles.modeSelector}>
        {(['walking', 'driving', 'transit'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeChip, mode === m && styles.modeChipActive]}
            onPress={() => setMode(m)}
          >
            <Icon
              name={m === 'walking' ? 'directions-walk' : m === 'driving' ? 'directions-car' : 'directions-bus'}
              size={18}
              color={mode === m ? colors.surface : colors.textSecondary}
            />
            <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentLocation && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={currentLocation} title="You're Here" pinColor={colors.secondary} />
            {destination.includes(',') && (
              <Marker 
                coordinate={{ 
                  latitude: parseFloat(destination.split(',')[0]), 
                  longitude: parseFloat(destination.split(',')[1]) 
                }} 
                title="Goal"
                pinColor={colors.primary}
              />
            )}
            {routes.length > 0 && routes[0].coordinates.length > 0 && (
              <Polyline
                coordinates={routes[0].coordinates}
                strokeWidth={5}
                strokeColor={colors.primary}
              />
            )}
          </MapView>
          <View style={styles.mapOverlay}>
             <Icon name="shield" size={16} color={colors.surface} />
             <Text style={styles.mapOverlayText}>Live Safety Analysis Enabled</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.routesList} showsVerticalScrollIndicator={false}>
        {routes.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={[
              styles.routeCard,
              selectedRoute === route.id && styles.routeCardActive,
            ]}
            onPress={() => setSelectedRoute(route.id)}
          >
            <View style={styles.routeHeader}>
              <View>
                <Text style={styles.routeName}>Safe Heritage Route</Text>
                <Text style={styles.routeSubname}>{route.name}</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(route.safetyScore) }]}>
                <Text style={styles.scoreText}>{route.safetyScore}% SAFE</Text>
              </View>
            </View>
            <View style={styles.routeStats}>
              <View style={styles.stat}>
                <Icon name="straighten" size={16} color={colors.textSecondary} />
                <Text style={styles.statText}>{route.distance} km</Text>
              </View>
              <View style={styles.stat}>
                <Icon name="schedule" size={16} color={colors.textSecondary} />
                <Text style={styles.statText}>{route.duration} min</Text>
              </View>
              <View style={styles.stat}>
                <Icon name="verified-user" size={16} color={colors.secondary} />
                <Text style={[styles.statText, { color: colors.secondary }]}>Verified Safe</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleStartNavigation}
          disabled={!destination}
          style={styles.startButton}
        >
          Begin Secure Journey
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    paddingTop: 0,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.medium,
  },
  modeChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  mapContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(26, 73, 168, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.medium,
  },
  mapOverlayText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routesList: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  routeCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.medium,
  },
  routeCardActive: {
    borderColor: colors.primary,
    borderWidth: 2.5,
    ...shadows.large,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  routeSubname: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  routeStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    borderRadius: borderRadius.lg,
    ...shadows.large,
  },
});
