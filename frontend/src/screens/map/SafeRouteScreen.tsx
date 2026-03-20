import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { SearchBar } from '@/components/common/SearchBar';
import { useLocationStore } from '@/store/locationStore';
import { theme } from '@/theme';
import { colors } from '@/theme/colors';
import { useNavigation } from '@react-navigation/native';
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
  const insets = useSafeAreaInsets();
  const { currentLocation } = useLocationStore();
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<'walking' | 'driving' | 'transit'>('walking');
  const [selectedRoute, setSelectedRoute] = useState<string>('a');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

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
        
        setRoutes([
          {
            id: 'a',
            name: `${modeString.toUpperCase()} Route`,
            distance: parseFloat(leg.distance.text.replace(/[^0-9.]/g, '')),
            duration: Math.round(leg.duration.value / 60),
            safetyScore: Math.floor(Math.random() * 20) + 80, // Mock safety score
            dangerZones: 0,
            coordinates: points,
          }
        ]);
        setSelectedRoute('a');
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
    const route = routes.find((r) => r.id === selectedRoute);
    if (route) {
      (navigation as any).navigate('Navigation', { route });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safe Route</Text>
        <View style={styles.headerIconButtonPlaceholder} />
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Enter destination"
          value={destination}
          onChangeText={setDestination}
          onSubmitEditing={fetchDirections}
          loading={loading}
        />
        <Button 
          variant="outline" 
          size="small" 
          onPress={fetchDirections} 
          style={{ marginTop: 8 }}
        >
          Get Directions
        </Button>
      </View>

      <View style={styles.modeSelector}>
        {(['walking', 'driving', 'transit'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            onPress={() => setMode(m)}
          >
            <Ionicons
              name={m === 'walking' ? 'walk' : m === 'driving' ? 'car' : 'bus'}
              size={20}
              color={mode === m ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={currentLocation} title="Current Location" />
          {routes.length > 0 && routes[0].coordinates.length > 0 && (
            <Polyline
              coordinates={routes[0].coordinates}
              strokeWidth={4}
              strokeColor={theme.colors.primary}
            />
          )}
        </MapView>
      )}

      <ScrollView style={styles.routesList}>
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
              <Text style={styles.routeName}>Route {route.id.toUpperCase()}: {route.name}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(route.safetyScore) }]}>
                <Text style={styles.scoreText}>{route.safetyScore}</Text>
              </View>
            </View>

            <View style={styles.routeStats}>
              <View style={styles.stat}>
                <Ionicons name="navigate" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{route.distance} km</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{route.duration} min</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="warning" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{route.dangerZones} zones</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
        <Button
          variant="primary"
          size="large"
          onPress={handleStartNavigation}
          disabled={!destination}
        >
          Start Navigation
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    minHeight: 56,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  modeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  modeTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  map: {
    height: 200,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  routesList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  routeCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardActive: {
    borderColor: theme.colors.primary,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  routeName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  scoreBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  scoreText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  routeStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
