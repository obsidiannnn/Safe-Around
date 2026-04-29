import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

export const AppPreparingScreen = () => (
  <View style={styles.container}>
    <View style={styles.logoShell}>
      <Icon name="verified-user" size={34} color={colors.primary} />
    </View>
    <Text style={styles.title}>SafeAround</Text>
    <Text style={styles.subtitle}>Preparing your safety workspace...</Text>
    <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECEFF3',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoShell: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
});
