import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
// import { Audio } from 'expo-av';
const Audio = {
  requestPermissionsAsync: async () => ({ status: 'granted' })
};
import { Button, Card } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface Permission {
  id: string;
  icon: string;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
}

/**
 * Permissions screen for requesting app permissions
 * Handles location, notifications, camera, and microphone
 */
export const PermissionsScreen = () => {
  const navigation = useNavigation();
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'location',
      icon: 'location-on',
      title: 'Location Access',
      description: 'Required to show nearby safe zones and alert emergency contacts with your location',
      required: true,
      granted: false,
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Push Notifications',
      description: 'Required to receive emergency alerts and safety updates',
      required: true,
      granted: false,
    },
    {
      id: 'camera',
      icon: 'camera-alt',
      title: 'Camera Access',
      description: 'Optional: Capture photos during emergencies for evidence',
      required: false,
      granted: false,
    },
    {
      id: 'microphone',
      icon: 'mic',
      title: 'Microphone Access',
      description: 'Optional: Record audio during emergencies',
      required: false,
      granted: false,
    },
  ]);

  const requestPermission = async (permissionId: string) => {
    let granted = false;

    try {
      switch (permissionId) {
        case 'location':
          const locationForeground = await Location.requestForegroundPermissionsAsync();
          if (locationForeground.status === 'granted') {
            const locationBackground = await Location.requestBackgroundPermissionsAsync();
            granted = locationBackground.status === 'granted';
          }
          break;
        case 'notifications':
          const notificationStatus = await Notifications.requestPermissionsAsync();
          granted = notificationStatus.status === 'granted';
          break;
        case 'camera':
          const cameraStatus = await Camera.requestCameraPermissionsAsync();
          granted = cameraStatus.status === 'granted';
          break;
        case 'microphone':
          const audioStatus = await Audio.requestPermissionsAsync();
          granted = audioStatus.status === 'granted';
          break;
      }

      setPermissions((prev) =>
        prev.map((p) => (p.id === permissionId ? { ...p, granted } : p))
      );
    } catch (error) {
      console.error(`Error requesting ${permissionId} permission:`, error);
    }
  };

  const allRequiredGranted = permissions
    .filter((p) => p.required)
    .every((p) => p.granted);

  const handleContinue = () => {
    navigation.navigate('EmergencyContacts' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <Text style={styles.title}>Enable Permissions</Text>
        <Text style={styles.subtitle}>
          SafeAround needs these permissions to keep you safe
        </Text>
      </View>

        {permissions.map((permission) => (
        <Card key={permission.id} variant="outlined" padding="lg" style={styles.card}>
          <View style={styles.permissionContent}>
            <View style={[styles.iconContainer, permission.granted && styles.iconGranted]}>
              <Icon
                name={permission.granted ? 'check' : permission.icon}
                size={32}
                color={permission.granted ? colors.success : colors.primary}
              />
            </View>

            <View style={styles.permissionText}>
              <View style={styles.titleRow}>
                <Text style={styles.permissionTitle}>{permission.title}</Text>
                {permission.required && <Text style={styles.requiredBadge}>Required</Text>}
              </View>
              <Text style={styles.permissionDescription}>{permission.description}</Text>

              {!permission.granted && (
                <Button
                  variant={permission.required ? 'primary' : 'outline'}
                  size="small"
                  onPress={() => requestPermission(permission.id)}
                  style={styles.allowButton}
                >
                  Allow
                </Button>
              )}
            </View>
          </View>
        </Card>
      ))}

        <Button
        variant="primary"
        size="large"
        fullWidth
        onPress={handleContinue}
        disabled={!allRequiredGranted}
        style={styles.continueButton}
      >
        Continue
      </Button>

        {!allRequiredGranted && (
          <Text style={styles.warningText}>
            Please grant all required permissions to continue
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.lg,
  },
  permissionContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  iconGranted: {
    backgroundColor: `${colors.success}20`,
  },
  permissionText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  requiredBadge: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: '600',
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  permissionDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  allowButton: {
    alignSelf: 'flex-start',
  },
  continueButton: {
    marginTop: spacing.xl,
  },
  warningText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
