import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Text } from 'react-native-paper';
import { Location } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface NearbyUser {
  id: string;
  location: Location;
}

interface NearbyUsersLayerProps {
  userLocation: Location;
  radius?: number;
}

/**
 * Shows anonymous nearby active users on the map
 * Updates every 30 seconds for privacy
 */
export const NearbyUsersLayer: React.FC<NearbyUsersLayerProps> = ({
  userLocation,
  radius = 1000,
}) => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      try {
        // TODO: Call API to get nearby users
        // Mock data for now
        const mockUsers: NearbyUser[] = [];
        setNearbyUsers(mockUsers);
      } catch (error) {
        console.error('Error fetching nearby users:', error);
      }
    };

    fetchNearbyUsers();
    const interval = setInterval(fetchNearbyUsers, 30000);

    return () => clearInterval(interval);
  }, [userLocation]);

  return (
    <>
      {nearbyUsers.map((user) => (
        <Marker
          key={user.id}
          coordinate={{
            latitude: user.location.latitude,
            longitude: user.location.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.userDot} />
        </Marker>
      ))}

      {nearbyUsers.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{nearbyUsers.length} users nearby</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  countBadge: {
    position: 'absolute',
    top: 140,
    left: spacing.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  countText: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
