import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SettingRow } from '@/components/profile/SettingRow';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '@/store/settingsStore';
import { theme } from '@/theme';

export const SettingsTab: React.FC = () => {
  const navigation = useNavigation();
  const { locationSharingMode, batteryOptimization, setBatteryOptimization } = useSettingsStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <SettingRow
          icon="key"
          title="Change Password"
          onPress={() => navigation.navigate('ChangePassword' as never)}
        />
        <SettingRow icon="call" title="Phone Verified" rightElement="text" rightValue="✓" />
        <SettingRow icon="mail" title="Email Verified" rightElement="text" rightValue="✓" />
        <SettingRow
          icon="trash"
          title="Delete Account"
          onPress={() => navigation.navigate('DeleteAccount' as never)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRIVACY</Text>
        <SettingRow
          icon="location"
          title="Location Sharing"
          subtitle={locationSharingMode}
          onPress={() => navigation.navigate('PrivacySettings' as never)}
        />
        <SettingRow icon="shield" title="Privacy Settings" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <SettingRow
          icon="notifications"
          title="Notification Settings"
          onPress={() => navigation.navigate('NotificationSettings' as never)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY</Text>
        <SettingRow icon="call" title="Auto-call 911" subtitle="After 90s" onPress={() => {}} />
        <SettingRow icon="phone-portrait" title="Shake to SOS" rightElement="toggle" rightValue={true} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <SettingRow icon="color-palette" title="Theme" subtitle="Light" onPress={() => {}} />
        <SettingRow icon="map" title="Map Style" subtitle="Standard" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA</Text>
        <SettingRow icon="trash" title="Clear Cache" onPress={() => {}} />
        <SettingRow icon="download" title="Download My Data" onPress={() => {}} />
        <SettingRow
          icon="battery-charging"
          title="Battery Optimization"
          rightElement="toggle"
          rightValue={batteryOptimization}
          onToggle={setBatteryOptimization}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <SettingRow icon="information-circle" title="App Version" rightElement="text" rightValue="1.0.0" />
        <SettingRow icon="document-text" title="Terms of Service" onPress={() => {}} />
        <SettingRow icon="shield-checkmark" title="Privacy Policy" onPress={() => {}} />
        <SettingRow icon="star" title="Rate App" onPress={() => {}} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
