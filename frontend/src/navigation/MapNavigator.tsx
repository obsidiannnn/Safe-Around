import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MapDashboardScreen } from '@/screens/map/MapDashboardScreen';
import { SafeRouteScreen } from '@/screens/map/SafeRouteScreen';
import { NavigationScreen } from '@/screens/map/NavigationScreen';
import { LocationHistoryScreen } from '@/screens/map/LocationHistoryScreen';
import { CrimeDetailsScreen } from '@/screens/map/CrimeDetailsScreen';

const Stack = createStackNavigator();

export const MapNavigator = () => {
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
