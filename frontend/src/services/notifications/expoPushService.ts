/**
 * Expo Push Notification Service
 * Send notifications directly from frontend without FCM Server Key
 */

export interface ExpoPushMessage {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

class ExpoPushService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';

  /**
   * Send push notification(s) via Expo Push Service
   * No FCM Server Key required!
   */
  async sendPushNotification(
    messages: ExpoPushMessage | ExpoPushMessage[]
  ): Promise<ExpoPushTicket[]> {
    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Array.isArray(messages) ? messages : [messages]),
      });

      if (!response.ok) {
        throw new Error(`Expo Push API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data as ExpoPushTicket[];
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send emergency alert to nearby users
   */
  async sendEmergencyAlert(
    recipientTokens: string[],
    alertData: {
      alertId: string;
      alertType: string;
      latitude: number;
      longitude: number;
      userName: string;
    }
  ): Promise<ExpoPushTicket[]> {
    // Filter out invalid tokens
    const validTokens = recipientTokens.filter(token => 
      token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
    );

    if (validTokens.length === 0) {
      console.warn('No valid Expo push tokens provided');
      return [];
    }

    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      title: '🚨 Emergency Alert Nearby',
      body: `${alertData.userName} needs urgent help. Please respond.`,
      data: {
        category: 'EMERGENCY_ALERT',
        alert_id: alertData.alertId,
        alert_type: alertData.alertType,
        latitude: alertData.latitude,
        longitude: alertData.longitude,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'emergency-alerts',
      categoryId: 'EMERGENCY_ALERT',
      badge: 1,
    }));

    return this.sendPushNotification(messages);
  }

  /**
   * Send responder accepted notification
   */
  async sendResponderAccepted(
    requesterToken: string,
    responderData: {
      name: string;
      distanceMeters: number;
      etaMinutes: number;
    }
  ): Promise<ExpoPushTicket[]> {
    const message: ExpoPushMessage = {
      to: requesterToken,
      title: '✅ Help is on the way!',
      body: `${responderData.name} is ${Math.round(responderData.distanceMeters)}m away (~${responderData.etaMinutes} min)`,
      data: {
        category: 'ALERT_STATUS',
        distance_m: responderData.distanceMeters,
        eta_minutes: responderData.etaMinutes,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'general-alerts',
      badge: 1,
    };

    return this.sendPushNotification(message);
  }

  /**
   * Send danger zone warning
   */
  async sendDangerZoneWarning(
    userToken: string,
    zoneData: {
      zoneName: string;
      severity: number;
      crimeCount: number;
    }
  ): Promise<ExpoPushTicket[]> {
    const message: ExpoPushMessage = {
      to: userToken,
      title: '⚠️ Danger Zone Alert',
      body: `You entered ${zoneData.zoneName}. ${zoneData.crimeCount} incidents reported recently.`,
      data: {
        category: 'DANGER_ZONE',
        zone_name: zoneData.zoneName,
        severity: zoneData.severity,
        crime_count: zoneData.crimeCount,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'general-alerts',
      badge: 1,
    };

    return this.sendPushNotification(message);
  }

  /**
   * Check delivery receipts for sent notifications
   */
  async getReceipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
    try {
      const response = await fetch(this.EXPO_RECEIPT_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (!response.ok) {
        throw new Error(`Expo Receipt API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data as Record<string, ExpoPushReceipt>;
    } catch (error) {
      console.error('Failed to get push receipts:', error);
      throw error;
    }
  }

  /**
   * Validate Expo push token format
   */
  isValidExpoPushToken(token: string): boolean {
    return (
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[')
    );
  }

  /**
   * Send batch notifications (up to 100 at once)
   */
  async sendBatchNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<ExpoPushTicket[]> {
    const BATCH_SIZE = 100; // Expo limit
    const allTickets: ExpoPushTicket[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const messages: ExpoPushMessage[] = batch.map(token => ({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }));

      const tickets = await this.sendPushNotification(messages);
      allTickets.push(...tickets);
    }

    return allTickets;
  }
}

export const expoPushService = new ExpoPushService();
