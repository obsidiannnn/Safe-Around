import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { EmergencyScreen } from '@/screens/emergency/EmergencyScreen';
import { AlertHistoryScreen } from '@/screens/emergency/AlertHistoryScreen';
import { EmergencyContactsManagementScreen } from '@/screens/profile/EmergencyContactsManagementScreen';
import { EmergencyActiveScreen } from '@/screens/emergency/EmergencyActiveScreen';
import { EmergencyResolutionScreen } from '@/screens/emergency/EmergencyResolutionScreen';
import { ResponderListScreen } from '@/screens/emergency/ResponderListScreen';
import { ResponderNavigationScreen } from '@/screens/emergency/ResponderNavigationScreen';
import { ChatScreen } from '@/screens/emergency/ChatScreen';
import { AlertDetailScreen } from '@/screens/emergency/AlertDetailScreen';

const Stack = createStackNavigator<any>();

export const EmergencyNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmergencyDashboard" component={EmergencyScreen} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsManagementScreen} />
      <Stack.Screen name="EmergencyActive" component={EmergencyActiveScreen} />
      <Stack.Screen name="EmergencyResolution" component={EmergencyResolutionScreen} />
      <Stack.Screen name="ResponderList" component={ResponderListScreen} />
      <Stack.Screen name="ResponderNavigation" component={ResponderNavigationScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
};
