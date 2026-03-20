import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types/navigation';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { MapScreen } from '@/screens/map/MapScreen';
import { EmergencyScreen } from '@/screens/emergency/EmergencyScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { colors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 85,
          paddingTop: 12,
          paddingBottom: 24,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderTopWidth: 0,
          position: 'absolute', // Floating effect over content
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
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
