import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SettingRow } from '@/components/profile/SettingRow';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';

export const SettingsTab: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    locationSharingMode,
    batteryOptimization,
    priorityAlerts,
    shakeToSOS,
    setBatteryOptimization,
    setPriorityAlerts,
    setShakeToSOS,
  } = useSettingsStore();
  const { logOut } = useAuth();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.securityStatusCard}>
        <View style={styles.statusHeader}>
          <Icon name="verified-user" size={20} color={colors.secondary} />
          <Text style={styles.statusTitle}>Secure Session Active</Text>
        </View>
        <Text style={styles.statusSubtitle}>Authenticated session protected by your device and account token</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT SECURITY</Text>
        <SettingRow
          icon="key"
          title="Change Password"
          onPress={() => navigation.navigate('ChangePassword' as never)}
        />
        <SettingRow
          icon="shield-checkmark"
          title="Phone Verification"
          subtitle={user?.is_phone_verified ? 'Your phone is verified for account recovery' : 'Verify your phone to improve account security'}
          rightElement="text"
          rightValue={user?.is_phone_verified ? 'Verified' : 'Pending'}
        />
        <SettingRow
          icon="trash"
          title="Delete My Records"
          onPress={() => navigation.navigate('DeleteAccount' as never)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRIVACY CONTROLS</Text>
        <SettingRow
          icon="location"
          title="Live Location Sharing"
          subtitle={locationSharingMode}
          onPress={() => navigation.navigate('PrivacySettings' as never)}
        />
        <SettingRow 
          icon="battery-charging" 
          title="Battery Optimization" 
          rightElement="toggle" 
          rightValue={batteryOptimization}
          onToggle={setBatteryOptimization}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY TRIGGERS</Text>
        <SettingRow
          icon="notifications"
          title="Priority Alerts"
          subtitle="Notify you for nearby emergency alerts"
          rightElement="toggle"
          rightValue={priorityAlerts}
          onToggle={setPriorityAlerts}
        />
        <SettingRow
          icon="phone-portrait"
          title="Shake to SOS"
          subtitle="Trigger SOS from shake detection when enabled"
          rightElement="toggle"
          rightValue={shakeToSOS}
          onToggle={setShakeToSOS}
        />
      </View>

      <View style={styles.footer}>
        <Button
          variant="outline"
          size="medium"
          fullWidth
          onPress={logOut}
          textStyle={{ color: colors.error }}
          style={styles.logoutButton}
        >
          Sign Out of Network
        </Button>
        <Text style={styles.versionText}>SafeAround - Secure Connection</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  securityStatusCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(30, 142, 62, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(30, 142, 62, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 28,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    letterSpacing: 1,
  },
  footer: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logoutButton: {
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  versionText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
});
