import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { EmergencyContactsManagementScreen } from '../screens/profile/EmergencyContactsManagementScreen';
import { AlertHistoryScreen } from '../screens/emergency/AlertHistoryScreen';
import { colors } from '@/theme/colors';

const Stack = createStackNavigator();

export const ProfileNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsManagementScreen} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
    </Stack.Navigator>
  );
};
