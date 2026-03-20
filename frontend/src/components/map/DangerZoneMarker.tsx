import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { DangerZone } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface DangerZoneMarkerProps {
  zone: DangerZone;
  onPress: (zone: DangerZone) => void;
}

/**
 * Custom marker for high-crime danger zones
 * Shows warning icon with crime count badge
 */
export const DangerZoneMarker: React.FC<DangerZoneMarkerProps> = ({ zone, onPress }) => {
  const getSeverityColor = (score: number): string => {
    if (score >= 75) return colors.error;
    if (score >= 50) return colors.warning;
    if (score >= 25) return '#FDD835';
    return colors.success;
  };

  const severityColor = getSeverityColor(100 - zone.safetyScore);

  return (
    <Marker
      coordinate={{
        latitude: zone.location.latitude,
        longitude: zone.location.longitude,
      }}
      onPress={() => onPress(zone)}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.container}>
        <View style={[styles.markerContainer, { backgroundColor: severityColor }]}>
          <Icon name="warning" size={24} color={colors.surface} />
        </View>
        {zone.crimeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{zone.crimeCount > 99 ? '99+' : zone.crimeCount}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '700',
  },
});
