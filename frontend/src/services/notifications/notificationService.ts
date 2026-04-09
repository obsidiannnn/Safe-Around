import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export enum NotificationCategory {
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  DANGER_ZONE = 'DANGER_ZONE',
  ALERT_STATUS = 'ALERT_STATUS',
  CRIME_REPORT = 'CRIME_REPORT',
  SAFETY_TIP = 'SAFETY_TIP',
}

/**
 * Singleton service for managing push notifications
 * Handles permission requests, token management, and notification scheduling
 */
class NotificationService {
  private static instance: NotificationService;
  private token: string | null = null;

  private constructor() {
    this.setNotificationHandler();
    this.setupNotificationCategories();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const category = notification.request.content.data?.category;
        
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: category === NotificationCategory.EMERGENCY_ALERT,
          shouldSetBadge: true,
          priority: category === NotificationCategory.EMERGENCY_ALERT 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH,
        };
      },
    });
  }

  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;

    try {
      const appOwnership = Constants.appOwnership;
      if (appOwnership === 'expo') {
        console.warn('Push token registration is skipped in Expo Go. Use a development build for remote notifications.');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!projectId || !uuidPattern.test(projectId)) {
        console.warn('Push token registration skipped because the Expo projectId is not configured as a valid EAS UUID.');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      this.token = token;
      return token;
    } catch (error) {
      console.warn('Error getting push token:', error);
      return null;
    }
  }

  async scheduleNotification(
    title: string,
    body: string,
    data: any,
    category: NotificationCategory = NotificationCategory.ALERT_STATUS
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, category },
        sound: category === NotificationCategory.EMERGENCY_ALERT ? 'default' : undefined,
        priority: category === NotificationCategory.EMERGENCY_ALERT 
          ? Notifications.AndroidNotificationPriority.MAX 
          : Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  private async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('EMERGENCY_ALERT', [
        {
          identifier: 'respond',
          buttonTitle: "I'm On My Way",
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'decline',
          buttonTitle: 'Decline',
          options: { opensAppToForeground: false },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('DANGER_ZONE', [
        {
          identifier: 'view',
          buttonTitle: 'View Details',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);
    }
  }
}

export const notificationService = NotificationService.getInstance();
