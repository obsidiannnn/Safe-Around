import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { MaterialIcons as Icon } from '@expo/vector-icons';
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
}

interface MapSearchBarProps {
  onSelectLocation: (result: SearchResult) => void;
  topOffset: number;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSelectLocation, topOffset }) => {
  return (
    <View style={[styles.container, { top: topOffset }]}>
      <GooglePlacesAutocomplete
        placeholder="Search locations..."
        fetchDetails={true}
        onPress={(data, details = null) => {
          if (details?.geometry?.location) {
            onSelectLocation({
              id: data.place_id,
              name: data.structured_formatting?.main_text || data.description,
              address: data.structured_formatting?.secondary_text || '',
              location: {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              },
            });
          }
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
        }}
        styles={{
          container: { flex: 1 },
          textInputContainer: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.sm,
            height: 48,
            alignItems: 'center',
            flexDirection: 'row',
            ...shadows.medium,
          },
          textInput: {
            color: colors.textPrimary,
            fontSize: fontSizes.md,
            flex: 1,
            backgroundColor: 'transparent',
            height: '100%',
            marginTop: 4,
          },
          listView: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            marginTop: spacing.sm,
            ...shadows.medium,
            elevation: 5,
          },
          row: {
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
          },
          separator: {
            height: 1,
            backgroundColor: colors.border,
          },
          description: {
            color: colors.textPrimary,
            fontSize: fontSizes.sm,
          },
        }}
        renderLeftButton={() => (
          <Icon name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        )}
      />
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
});
