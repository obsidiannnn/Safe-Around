import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import { Linking, Platform } from 'react-native';

export type PermissionType = 'location' | 'notifications' | 'camera' | 'microphone' | 'motion';

export interface PermissionStatus {
  type: PermissionType;
  granted: boolean;
  canAskAgain: boolean;
  critical: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([
    { type: 'location', granted: false, canAskAgain: true, critical: true },
    { type: 'notifications', granted: false, canAskAgain: true, critical: true },
    { type: 'camera', granted: false, canAskAgain: true, critical: false },
    { type: 'microphone', granted: false, canAskAgain: true, critical: false },
    { type: 'motion', granted: false, canAskAgain: true, critical: false },
  ]);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    const locationStatus = await Location.getForegroundPermissionsAsync();
    const notificationStatus = await Notifications.getPermissionsAsync();
    const cameraStatus = await Camera.getCameraPermissionsAsync();

    setPermissions([
      {
        type: 'location',
        granted: locationStatus.status === 'granted',
        canAskAgain: locationStatus.canAskAgain,
        critical: true,
      },
      {
        type: 'notifications',
        granted: notificationStatus.status === 'granted',
        canAskAgain: notificationStatus.canAskAgain,
        critical: true,
      },
      {
        type: 'camera',
        granted: cameraStatus.status === 'granted',
        canAskAgain: cameraStatus.canAskAgain,
        critical: false,
      },
      {
        type: 'microphone',
        granted: false,
        canAskAgain: true,
        critical: false,
      },
      {
        type: 'motion',
        granted: false,
        canAskAgain: true,
        critical: false,
      },
    ]);
  };

  const requestPermission = async (type: PermissionType): Promise<boolean> => {
    let result;

    switch (type) {
      case 'location':
        result = await Location.requestForegroundPermissionsAsync();
        break;
      case 'notifications':
        result = await Notifications.requestPermissionsAsync();
        break;
      case 'camera':
        result = await Camera.requestCameraPermissionsAsync();
        break;
      default:
        return false;
    }

    await checkAllPermissions();
    return result.status === 'granted';
  };

  const requestAllCritical = async (): Promise<boolean> => {
    const locationGranted = await requestPermission('location');
    const notificationGranted = await requestPermission('notifications');
    return locationGranted && notificationGranted;
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const hasCriticalPermissions = permissions
    .filter((p) => p.critical)
    .every((p) => p.granted);

  return {
    permissions,
    requestPermission,
    requestAllCritical,
    openSettings,
    hasCriticalPermissions,
  };
};
