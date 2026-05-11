import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InteractionManager } from 'react-native';
import { MapDashboardScreen } from '@/screens/map/MapDashboardScreen';
import { SafeRouteScreen } from '@/screens/map/SafeRouteScreen';
import { NavigationScreen } from '@/screens/map/NavigationScreen';
import { LocationHistoryScreen } from '@/screens/map/LocationHistoryScreen';
import { CrimeDetailsScreen } from '@/screens/map/CrimeDetailsScreen';
import { AppPreparingScreen } from '@/components/common/AppPreparingScreen';

const Stack = createStackNavigator();

export const MapNavigator = () => {
  const [isMapTabReady, setIsMapTabReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (!isCancelled) {
          setIsMapTabReady(true);
        }
      }, 1200);
    });

    return () => {
      isCancelled = true;
      interactionTask.cancel();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (!isMapTabReady) {
    return <AppPreparingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapDashboard" component={MapDashboardScreen} />
      <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
      <Stack.Screen name="Navigation" component={NavigationScreen} />
      <Stack.Screen name="LocationHistory" component={LocationHistoryScreen} />
      <Stack.Screen name="CrimeDetails" component={CrimeDetailsScreen} />
    </Stack.Navigator>
  );
};
