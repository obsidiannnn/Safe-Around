import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MapScreen } from '@/screens/map/MapScreen';
import { EmergencyScreen } from '@/screens/emergency/EmergencyScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { colors } from '@/theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="map" size={size} color={color} />,
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="warning" size={size} color={color} />,
          tabBarLabel: 'Emergency',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="person" size={size} color={color} />,
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
