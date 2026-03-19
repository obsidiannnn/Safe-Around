import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { useLocationStore } from '@/store/locationStore';
import { theme } from '@/theme';
import { useNavigation, useRoute } from '@react-navigation/native';

export const NavigationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentLocation } = useLocationStore();
  const [eta, setEta] = useState(15);
  const [distanceRemaining, setDistanceRemaining] = useState(1.2);
  const [nextInstruction, setNextInstruction] = useState('Turn right on Main Street');
  const [distanceToTurn, setDistanceToTurn] = useState(200);
  const [currentStreet, setCurrentStreet] = useState('Park Avenue');

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.instructionContainer}>
        <Text style={styles.instruction}>{nextInstruction}</Text>
        <Text style={styles.distance}>in {distanceToTurn}m</Text>
        <Text style={styles.currentStreet}>{currentStreet}</Text>
      </View>

      {currentLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          followsUserLocation
        >
          <Marker coordinate={currentLocation} />
        </MapView>
      )}

      <View style={styles.footer}>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{eta} min</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="navigate" size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{distanceRemaining.toFixed(1)} km</Text>
          </View>
        </View>
        <Button variant="outline" onPress={handleCancel}>
          Cancel Navigation
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
  instructionContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  instruction: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  distance: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  currentStreet: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});
