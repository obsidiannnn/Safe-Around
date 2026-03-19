import { useEffect } from 'react';
import { notificationService } from '@/services/notifications/notificationService';

export const useNotifications = () => {
  useEffect(() => {
    const notificationListener = notificationService.addNotificationListener((notification) => {
      console.log('Notification received:', notification);
    });

    const responseListener = notificationService.addNotificationResponseListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const requestPermissions = async () => {
    return await notificationService.requestPermissions();
  };

  const getPushToken = async () => {
    return await notificationService.getPushToken();
  };

  return {
    requestPermissions,
    getPushToken,
  };
};
