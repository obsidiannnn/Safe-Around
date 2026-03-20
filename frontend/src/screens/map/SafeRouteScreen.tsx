import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { SearchBar } from '@/components/common/SearchBar';
import { useLocationStore } from '@/store/locationStore';
import { theme } from '@/theme';
import { useNavigation } from '@react-navigation/native';

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
  const [selectedRoute, setSelectedRoute] = useState<string>('b');
  const [routes] = useState<Route[]>([
    {
      id: 'a',
      name: 'Fastest',
      distance: 1.2,
      duration: 15,
      safetyScore: 65,
      dangerZones: 2,
      coordinates: [],
    },
    {
      id: 'b',
      name: 'Safest',
      distance: 1.5,
      duration: 19,
      safetyScore: 92,
      dangerZones: 0,
      coordinates: [],
    },
    {
      id: 'c',
      name: 'Balanced',
      distance: 1.3,
      duration: 16,
      safetyScore: 78,
      dangerZones: 1,
      coordinates: [],
    },
  ]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const handleStartNavigation = () => {
    const route = routes.find((r) => r.id === selectedRoute);
    if (route) {
      navigation.navigate('Navigation' as never, { route } as never);
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
        />
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
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker coordinate={currentLocation} title="Current Location" />
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
