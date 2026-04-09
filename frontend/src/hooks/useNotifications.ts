import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationCategory } from '@/services/notifications/notificationService';
import { useNavigation } from '@react-navigation/native';

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    checkPermission();
    setupNotificationListeners();
  }, []);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    
    if (granted) {
      const token = await notificationService.getToken();
      setExpoPushToken(token);
    }
    
    return granted;
  }, []);

  const scheduleNotification = useCallback(
    async (title: string, body: string, data: any, category?: NotificationCategory): Promise<string> => {
      return await notificationService.scheduleNotification(title, body, data, category);
    },
    []
  );

  const setupNotificationListeners = () => {
    // Handle notification received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification tap
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  };

  const handleNotificationTap = (data: any) => {
    const { category, alert_id, zone_id, crime_id } = data;

    switch (category) {
      case NotificationCategory.EMERGENCY_ALERT:
        (navigation as any).navigate('ResponderNavigation', { alertId: alert_id });
        break;
      case NotificationCategory.DANGER_ZONE:
        (navigation as any).navigate('CrimeDetails', { zoneId: zone_id });
        break;
      case NotificationCategory.CRIME_REPORT:
        (navigation as any).navigate('CrimeDetails', { zoneId: crime_id });
        break;
      default:
        break;
    }
  };

  return {
    hasPermission,
    expoPushToken,
    requestPermission,
    scheduleNotification,
  };
};
