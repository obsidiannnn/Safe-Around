import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SearchBar, Badge } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { GOOGLE_MAPS_API_KEY } from '@/config/env';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  safetyScore?: number;
}

interface MapSearchBarProps {
  onSelectLocation: (result: SearchResult) => void;
}

/**
 * Search bar for locations with crime rating badges
 * Shows recent searches and saved places
 */
export const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSelectLocation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const recentSearches: SearchResult[] = [
    // Mock data - would come from storage
  ];

  const savedPlaces: SearchResult[] = [
    // Mock data - would come from user profile
  ];

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        const places: SearchResult[] = data.predictions.map((p: any) => ({
          id: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          address: p.structured_formatting?.secondary_text || '',
          location: { latitude: 0, longitude: 0 }, // Fetched on select
          safetyScore: Math.floor(Math.random() * 30) + 70 // Fake safety score just for UI visualization
        }));
        setResults(places);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = async (item: SearchResult) => {
    setShowResults(false);
    setSearchQuery(item.name);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.id}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        onSelectLocation({
          ...item,
          location: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          }
        });
      } else {
        onSelectLocation(item);
      }
    } catch (err) {
      onSelectLocation(item);
    }
  };

  const getSafetyBadgeColor = (score?: number): 'green' | 'orange' | 'red' => {
    if (!score) return 'gray' as any;
    if (score >= 70) return 'green';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={styles.resultItem}
      onPress={() => selectPlace(item)}
    >
      <Icon name="location-on" size={20} color={colors.textSecondary} style={styles.resultIcon} />
      <View style={styles.resultContent}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address}</Text>
      </View>
      {item.safetyScore !== undefined && (
        <Badge
          variant="status"
          color={getSafetyBadgeColor(item.safetyScore)}
          label={`${item.safetyScore}`}
        />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { top: insets.top + 70 }]}>
      <SearchBar
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          handleSearch(text);
        }}
        placeholder="Search locations..."
        loading={isSearching}
      />

      {showResults && (
        <View style={styles.resultsContainer}>
          {savedPlaces.length > 0 && searchQuery.length === 0 && (
            <>
              <Text style={styles.sectionTitle}>Saved Places</Text>
              <FlatList
                data={savedPlaces}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
              />
            </>
          )}

          {recentSearches.length > 0 && searchQuery.length === 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <FlatList
                data={recentSearches}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
              />
            </>
          )}

          {results.length > 0 && (
            <FlatList
              data={results}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
            />
          )}

          {searchQuery.length >= 3 && results.length === 0 && !isSearching && (
            <Text style={styles.noResults}>No results found</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },
  resultsContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.medium,
    maxHeight: 300,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIcon: {
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  resultAddress: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noResults: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
