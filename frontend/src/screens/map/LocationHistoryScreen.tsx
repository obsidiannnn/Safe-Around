import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Heatmap } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { useLocationStore } from '@/store/locationStore';
import { theme } from '@/theme';
import { useNavigation } from '@react-navigation/native';

type TimeRange = '24h' | '7d' | '30d';

export const LocationHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { locationHistory, clearHistory } = useLocationStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const handleClearHistory = () => {
    clearHistory();
  };

  const getFilteredHistory = () => {
    const now = Date.now();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    return locationHistory.filter(
      (loc) => now - (loc.timestamp || 0) <= ranges[timeRange]
    );
  };

  const filteredHistory = getFilteredHistory();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location History</Text>
        <TouchableOpacity onPress={handleClearHistory}>
          <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.filterButton, timeRange === range && styles.filterButtonActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.filterText, timeRange === range && styles.filterTextActive]}>
              {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredHistory.length > 0 && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: filteredHistory[0].latitude,
            longitude: filteredHistory[0].longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {filteredHistory.map((loc, index) => (
            <Marker
              key={index}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              pinColor={theme.colors.primary}
            />
          ))}
        </MapView>
      )}

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>{filteredHistory.length} locations</Text>
        </View>
        <Text style={styles.privacyText}>
          History auto-deletes after 90 days
        </Text>
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
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
  },
  map: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoContainer: {
    padding: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  privacyText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
