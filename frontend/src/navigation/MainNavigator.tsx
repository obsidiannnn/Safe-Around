import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types/navigation';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { EmergencyNavigator } from './EmergencyNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { colors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { MapNavigator } from './MapNavigator';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShakeDetection } from '@/hooks/useShakeDetection';
import { useAlertStore } from '@/store/alertStore';
import { useLocation } from '@/hooks/useLocation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  const { isAlertActive, createAlert } = useAlertStore();
  const { currentLocation } = useLocation();
  
  // Global Shake Detection for Emergency SOS
  useShakeDetection({
    enabled: !isAlertActive,
    onShake: async () => {
      console.log('Global Shake Detected! Triggering Emergency SOS.');
      if (currentLocation) {
        try {
          await createAlert(currentLocation, true); // Silent mode by default for shake
          console.log('Shake-based Silent Alert Created Successfully.');
        } catch (error) {
          console.error('Failed to create shake-based alert:', error);
        }
      }
    }
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 52 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 10,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapNavigator}
        options={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="map" size={size} color={focused ? colors.primary : color} />
          ),
          tabBarLabel: 'MAP',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginTop: 4,
          },
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'MapDashboard';
            if (['SafeRoute', 'Navigation', 'LocationHistory', 'CrimeDetails'].includes(routeName)) {
              return { display: 'none' };
            }
            return {
          height: 52 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 10,
          overflow: 'visible',
            };
          })(route),
        })}
      />
      <Tab.Screen
        name="Emergency"
        component={EmergencyNavigator}
        options={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="notifications" size={size} color={focused ? colors.primary : color} />
          ),
          tabBarLabel: 'ALERTS',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginTop: 4,
          },
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'EmergencyDashboard';
            if (['EmergencyActive', 'EmergencyResolution', 'ResponderNavigation'].includes(routeName)) {
              return { display: 'none' };
            }
            return {
              height: 52 + insets.bottom,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 10,
              overflow: 'visible',
            };
          })(route),
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="person" size={size} color={focused ? colors.primary : color} />
          ),
          tabBarLabel: 'PROFILE',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginTop: 4,
          },
        }}
      />
    </Tab.Navigator>
  );
};
