import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { theme } from '@/theme';

interface CriticalPermissionGateProps {
  visible: boolean;
  missingPermissions: string[];
  onRequestPermissions: () => void;
}

export const CriticalPermissionGate: React.FC<CriticalPermissionGateProps> = ({
  visible,
  missingPermissions,
  onRequestPermissions,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Permissions Required</Text>
        
        <Text style={styles.description}>
          SafeAround needs the following permissions to keep you safe:
        </Text>

        <View style={styles.permissionsList}>
          {missingPermissions.includes('location') && (
            <View style={styles.permissionItem}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <View style={styles.permissionText}>
                <Text style={styles.permissionName}>Location (Always)</Text>
                <Text style={styles.permissionReason}>
                  To send emergency alerts to nearby users
                </Text>
              </View>
            </View>
          )}

          {missingPermissions.includes('notifications') && (
            <View style={styles.permissionItem}>
              <Ionicons name="notifications" size={24} color={theme.colors.primary} />
              <View style={styles.permissionText}>
                <Text style={styles.permissionName}>Notifications</Text>
                <Text style={styles.permissionReason}>
                  To receive emergency alerts from others
                </Text>
              </View>
            </View>
          )}
        </View>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={onRequestPermissions}
          style={styles.button}
        >
          Enable Permissions
        </Button>

        <Text style={styles.footer}>
          Without these permissions, SafeAround cannot function properly
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    zIndex: 10000,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  permissionsList: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  permissionText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  permissionName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  permissionReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    marginBottom: theme.spacing.md,
  },
  footer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
