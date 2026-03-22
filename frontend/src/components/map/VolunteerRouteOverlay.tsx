import React from 'react';
import { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface Props {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  onReady?: (result: any) => void;
  onError?: (errorMessage: string) => void;
}

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY';

export const VolunteerRouteOverlay: React.FC<Props> = ({ origin, destination, onReady, onError }) => {
  return (
    <>
      {/* Victim Marker */}
      <Marker
        coordinate={destination}
        title="Distressed User"
        description="Help is needed here!"
        pinColor={colors.error}
      >
        <View style={styles.victimMarkerContainer}>
          <Icon name="warning" size={30} color={colors.error} />
        </View>
      </Marker>

      {/* Route Path */}
      <MapViewDirections
        origin={origin}
        destination={destination}
        apikey={GOOGLE_MAPS_APIKEY}
        strokeWidth={4}
        strokeColor={colors.primary}
        optimizeWaypoints={true}
        mode="DRIVING"
        onReady={onReady}
        onError={onError}
      />
    </>
  );
};

const styles = StyleSheet.create({
  victimMarkerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
    borderWidth: 2,
    borderColor: colors.error,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
