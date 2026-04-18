import React, { useEffect, useRef, useState } from 'react';
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
import CrimeWebSocketService from '@/services/websocket/CrimeWebSocket';
import { WEBSOCKET_URL } from '@/config/env';
import { useAuthStore } from '@/store/authStore';

import { useShakeDetection } from '@/hooks/useShakeDetection';
import { useAlertStore } from '@/store/alertStore';
import { useLocation } from '@/hooks/useLocation';
import { useSettingsStore } from '@/store/settingsStore';
import { ResponderAlertModal } from '@/screens/emergency/ResponderAlertModal';
import { Alert, Location } from '@/types/models';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  const { isAlertActive, createAlert, activeAlert } = useAlertStore();
  const { currentLocation } = useLocation();
  const { shakeToSOS, priorityAlerts } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const [incomingAlert, setIncomingAlert] = useState<Alert | null>(null);
  const [incomingDistance, setIncomingDistance] = useState(0);
  const latestLocationRef = useRef(currentLocation);
  const latestIncomingAlertIdRef = useRef<string | null>(null);
  
  // Global Shake Detection for Emergency SOS
  useShakeDetection({
    enabled: shakeToSOS && !isAlertActive,
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

  useEffect(() => {
    latestLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    latestIncomingAlertIdRef.current = incomingAlert?.id ?? null;
  }, [incomingAlert]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    CrimeWebSocketService.connect(`${WEBSOCKET_URL}/ws/crime`);

    const handleEmergencyAlert = (data: any) => {
      if (!priorityAlerts) return;

      const authUserId = String(useAuthStore.getState().user?.id ?? '');
      const sourceUserId = String(data.user?.user_id ?? '');
      const recipientIds = Array.isArray(data.recipient_user_ids)
        ? data.recipient_user_ids.map((id: unknown) => String(id))
        : [];
      const liveAlert = useAlertStore.getState().activeAlert;

      if (!authUserId || sourceUserId === authUserId) return;
      if (recipientIds.length > 0 && !recipientIds.includes(authUserId)) return;
      if (liveAlert?.id === data.alert_id || useAlertStore.getState().isAlertActive) return;

      const location = {
        latitude: Number(data.location?.latitude),
        longitude: Number(data.location?.longitude),
      };

      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        return;
      }

      setIncomingDistance(
        latestLocationRef.current
          ? Math.round(getDistanceMeters(latestLocationRef.current, location))
          : Math.max(0, Math.round(Number(data.distance) || 0))
      );
      setIncomingAlert({
        id: String(data.alert_id),
        userId: sourceUserId,
        type: 'panic',
        status: 'active',
        location,
        currentRadius: Number(data.current_radius || 100),
        usersNotified: Number(data.users_notified || 0),
        createdAt: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
      });
    };

    const handleRoomClosed = (data: any) => {
      const closedAlertId = String(data?.alert_id ?? data?.room_id ?? '');
      if (!closedAlertId || !latestIncomingAlertIdRef.current) {
        return;
      }

      const normalizedClosedAlertId = closedAlertId.startsWith('alert_')
        ? closedAlertId.replace(/^alert_/, '')
        : closedAlertId;

      if (normalizedClosedAlertId === latestIncomingAlertIdRef.current) {
        setIncomingAlert(null);
      }
    };

    CrimeWebSocketService.on('emergency_alert', handleEmergencyAlert);
    CrimeWebSocketService.on('room_closed', handleRoomClosed);

    return () => {
      CrimeWebSocketService.off('emergency_alert', handleEmergencyAlert);
      CrimeWebSocketService.off('room_closed', handleRoomClosed);
      CrimeWebSocketService.disconnect();
    };
  }, [isAuthenticated, priorityAlerts]);

  useEffect(() => {
    if (activeAlert) {
      setIncomingAlert(null);
    }
  }, [activeAlert]);

  return (
    <>
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
      {incomingAlert ? (
        <ResponderAlertModal
          visible={true}
          alert={incomingAlert}
          distance={incomingDistance}
          onClose={() => setIncomingAlert(null)}
        />
      ) : null}
    </>
  );
};

function getDistanceMeters(
  origin: Pick<Location, 'latitude' | 'longitude'>,
  destination: Pick<Location, 'latitude' | 'longitude'>
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
