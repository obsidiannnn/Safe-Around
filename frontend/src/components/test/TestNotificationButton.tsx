/**
 * Test Component: Send Push Notification from Frontend
 * 
 * Usage: Add this to any screen to test notifications
 * 
 * import { TestNotificationButton } from '@/components/test/TestNotificationButton';
 * <TestNotificationButton />
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput } from 'react-native';
import { Button } from '@/components/common';
import { expoPushService } from '@/services/notifications/expoPushService';
import { notificationService } from '@/services/notifications/notificationService';
import { Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export const TestNotificationButton = () => {
  const [myToken, setMyToken] = useState<string>('');
  const [targetToken, setTargetToken] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const getMyToken = async () => {
    try {
      const hasPermission = await notificationService.requestPermission();
      if (!hasPermission) {
        Alert.alert('Error', 'Notification permission denied');
        return;
      }

      const token = await notificationService.getToken();
      if (token) {
        setMyToken(token);
        Alert.alert(
          'Your Push Token',
          token,
          [
            { text: 'Copy', onPress: () => console.log('Token:', token) },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not get push token');
      }
    } catch (error) {
      console.error('Error getting token:', error);
      Alert.alert('Error', 'Failed to get push token');
    }
  };

  const sendTestNotification = async () => {
    if (!targetToken) {
      Alert.alert('Error', 'Please enter a target token');
      return;
    }

    if (!expoPushService.isValidExpoPushToken(targetToken)) {
      Alert.alert('Error', 'Invalid Expo push token format');
      return;
    }

    setLoading(true);
    try {
      const tickets = await expoPushService.sendPushNotification({
        to: targetToken,
        title: '🧪 Test Notification',
        body: 'This is a test notification from SafeAround frontend!',
        data: {
          category: 'TEST',
          timestamp: new Date().toISOString(),
        },
        sound: 'default',
        priority: 'high',
      });

      const success = tickets.filter(t => t.status === 'ok').length;
      const failed = tickets.filter(t => t.status === 'error').length;

      if (success > 0) {
        Alert.alert(
          '✅ Success',
          `Notification sent successfully!\n\nTicket ID: ${tickets[0].id}`
        );
      } else {
        Alert.alert(
          '❌ Failed',
          `Failed to send notification.\n\nError: ${tickets[0].message || 'Unknown error'}`
        );
      }
    } catch (error: any) {
      console.error('Send notification error:', error);
      Alert.alert('Error', error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const sendEmergencyTest = async () => {
    if (!targetToken) {
      Alert.alert('Error', 'Please enter a target token');
      return;
    }

    setLoading(true);
    try {
      const tickets = await expoPushService.sendEmergencyAlert([targetToken], {
        alertId: 'test-alert-' + Date.now(),
        alertType: 'emergency',
        latitude: 28.5355,
        longitude: 77.3910,
        userName: 'Test User',
      });

      const success = tickets.filter(t => t.status === 'ok').length;
      
      if (success > 0) {
        Alert.alert('✅ Success', 'Emergency alert sent!');
      } else {
        Alert.alert('❌ Failed', tickets[0].message || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Test Notifications</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Step 1: Get Your Token</Text>
        <Button 
          variant="outline" 
          size="small" 
          onPress={getMyToken}
          icon="key"
        >
          Get My Push Token
        </Button>
        {myToken && (
          <Text style={styles.tokenText} numberOfLines={2}>
            {myToken}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Step 2: Enter Target Token</Text>
        <TextInput
          style={styles.input}
          placeholder="ExponentPushToken[...]"
          value={targetToken}
          onChangeText={setTargetToken}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Step 3: Send Test</Text>
        <View style={styles.buttonRow}>
          <Button
            variant="primary"
            size="small"
            onPress={sendTestNotification}
            disabled={loading || !targetToken}
            icon="send"
            style={styles.button}
          >
            Send Test
          </Button>
          <Button
            variant="secondary"
            size="small"
            onPress={sendEmergencyTest}
            disabled={loading || !targetToken}
            icon="warning"
            style={styles.button}
          >
            Send SOS
          </Button>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Tip: Copy your token and paste it in another device to test cross-device notifications!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 80,
  },
  tokenText: {
    marginTop: spacing.sm,
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: colors.info + '20',
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
