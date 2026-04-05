import React, { useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
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
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSelectLocation, topOffset, currentLocation }) => {
  const ref = useRef<GooglePlacesAutocompleteRef>(null);

  const handleClear = () => {
    ref.current?.clear();
    ref.current?.setAddressText('');
  };

  return (
    <View style={[styles.container, { top: topOffset }]}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Search for any place..."
        fetchDetails={true}
        debounce={400}
        minLength={3}
        onPress={(data, details = null) => {
          console.log('Place selected:', data.description);
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
          components: 'country:in', // Prioritize India
          location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : undefined,
          radius: '20000', // 20km bias
          strictbounds: false, // Don't restrict, just bias
        }}
        onFail={(error) => console.error('Google Places Dashboard Error:', error)}
        keyboardShouldPersistTaps="always"
        suppressDefaultStyles={false}
        enablePoweredByContainer={false}
        styles={{
          container: { flex: 1 },
          textInputContainer: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.pill,
            paddingHorizontal: spacing.md,
            height: 52,
            alignItems: 'center',
            flexDirection: 'row',
            ...shadows.large,
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
            ...shadows.large,
            elevation: 10,
            zIndex: 1000,
            maxHeight: 350,
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
            fontSize: 14,
            fontWeight: '500',
          },
        }}
        renderLeftButton={() => (
          <Icon name="location-searching" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
        )}
        renderRightButton={() => (
          <Pressable onPress={handleClear} style={{ padding: 8 }}>
            <Icon name="cancel" size={20} color={colors.textSecondary} />
          </Pressable>
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
    zIndex: 2000,
  },
});
