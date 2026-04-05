import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { useLocationStore } from '@/store/locationStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { useNavigation, useRoute } from '@react-navigation/native';
import { audioService } from '@/services/audioService';

// Haversine formula for real-time distance calculation
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Strips HTML tags from Google API instructions
const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
};

export const NavigationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const routeParams = useRoute();
  const mapRef = useRef<MapView>(null);
  const { currentLocation } = useLocationStore();
  
  const params = routeParams.params as any;
  const navRoute = params?.route;
  const mode = params?.mode || 'walking';
  
  const [distanceRemaining, setDistanceRemaining] = useState(navRoute?.distance || 0);
  const [eta, setEta] = useState(navRoute?.duration || 0);
  const [isFollowing, setIsFollowing] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Voice Guidance: speak whenever step changes
  useEffect(() => {
    if (!isMuted && navRoute?.steps?.[currentStepIndex]) {
      const instruction = stripHtml(navRoute.steps[currentStepIndex].html_instructions);
      // Play a short chime first, then speak
      audioService.playSound('PING');
      setTimeout(() => {
        audioService.speak(instruction);
      }, 500);
    }
  }, [currentStepIndex, isMuted]);

  // Update dynamic stats when location changes
  useEffect(() => {
    if (!currentLocation || !navRoute?.coordinates) return;

    // 1. Calculate distance to destination
    const dest = navRoute.coordinates[navRoute.coordinates.length - 1];
    const dist = getDistance(
      currentLocation.latitude, 
      currentLocation.longitude, 
      dest.latitude, 
      dest.longitude
    );
    setDistanceRemaining(dist);

    // Arrival Check (within 50 meters)
    if (dist < 0.05 && dist > 0) {
      audioService.playSound('SUCCESS');
      audioService.speak('You have arrived at your secure destination.');
    }

    // 2. Adjust ETA (Average speeds in km/h)
    const speeds = { walking: 5, driving: 40, transit: 30 };
    const speed = (speeds as any)[mode] || 5;
    const timeRemaining = (dist / speed) * 60; // in minutes
    setEta(Math.max(1, Math.round(timeRemaining)));

    // 3. Find current navigation step
    if (navRoute.steps && navRoute.steps.length > 0) {
      let closestStep = currentStepIndex;
      let minStepDist = Infinity;
      
      // Look at the next 2 steps to see if we've moved forward
      for (let i = currentStepIndex; i < Math.min(currentStepIndex + 3, navRoute.steps.length); i++) {
        const step = navRoute.steps[i];
        const stepDist = getDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          step.start_location.lat,
          step.start_location.lng
        );
        if (stepDist < minStepDist) {
          minStepDist = stepDist;
          closestStep = i;
        }
      }
      if (closestStep !== currentStepIndex) {
        setCurrentStepIndex(closestStep);
      }
    }

    // 4. Animate map if following
    if (isFollowing && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 800);
    }
  }, [currentLocation]);

  const handleCancel = () => {
    audioService.stopAll();
    navigation.goBack();
  };

  const handleRecenter = () => {
    setIsFollowing(true);
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 500);
    }
  };

  const toggleMute = () => {
    const newMutedValue = audioService.toggleMute();
    setIsMuted(newMutedValue);
  };

  const currentStep = navRoute?.steps?.[currentStepIndex];
  const instructionDisplay = currentStep 
    ? stripHtml(currentStep.html_instructions) 
    : 'Continue on your safe route';
  
  const nextStepDist = currentStep ? currentStep.distance.text : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.instructionCard}>
        <View style={styles.instructionIcon}>
          <Ionicons name="navigate" size={32} color={colors.surface} />
        </View>
        <View style={styles.instructionTextContainer}>
          <Text style={styles.instruction} numberOfLines={2}>{instructionDisplay}</Text>
          {nextStepDist && <Text style={styles.distanceText}>{nextStepDist}</Text>}
        </View>
      </View>

      {currentLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? 'google' : undefined}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={true}
          onPanDrag={() => setIsFollowing(false)}
        >
          {navRoute?.coordinates && (
            <Polyline
              coordinates={navRoute.coordinates}
              strokeWidth={7}
              strokeColor={colors.primary}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {navRoute?.coordinates?.length > 0 && (
            <Marker 
              coordinate={navRoute.coordinates[navRoute.coordinates.length - 1]} 
              title="Destination"
            >
              <View style={styles.destMarker}>
                <Ionicons name="location" size={30} color={colors.error} />
              </View>
            </Marker>
          )}
        </MapView>
      )}

      {!isFollowing && (
        <TouchableOpacity 
          style={styles.recenterButton} 
          onPress={handleRecenter}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
          <Text style={styles.recenterText}>Re-center</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), paddingTop: 20 }]}>
        <View style={styles.tripInfo}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{eta}</Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{distanceRemaining.toFixed(1)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(eta * 0.82)}</Text>
            <Text style={styles.statLabel}>pm</Text>
          </View>
        </View>
        
        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={styles.searchFab}
            onPress={() => navigation.navigate('SafeRoute' as never)}
          >
            <Ionicons name="search" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Button 
            variant="danger" 
            onPress={handleCancel}
            style={[styles.exitButton, { height: 52 }]}
            textStyle={{ fontWeight: '800', fontSize: 16 }}
          >
            Exit
          </Button>
          <TouchableOpacity 
            style={[styles.audioFab, isMuted && { backgroundColor: 'rgba(234, 67, 53, 0.1)' }]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-medium"} 
              size={24} 
              color={isMuted ? colors.error : colors.textPrimary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  instructionCard: {
    position: 'absolute',
    top: spacing.lg + 10,
    left: spacing.md,
    right: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.large,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionIcon: {
    width: 54,
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  instructionTextContainer: {
    flex: 1,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  distanceText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recenterText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  destMarker: {
    padding: 5,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.large,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exitButton: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderColor: colors.error,
    borderWidth: 1,
    height: 48,
  },
  searchFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
