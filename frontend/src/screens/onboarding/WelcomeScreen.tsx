import React, { ComponentProps } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface FeatureProps {
  icon: ComponentProps<typeof Icon>['name'];
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => (
  <View style={styles.feature}>
    <View style={styles.iconContainer}>
      <Icon name={icon} size={32} color={colors.primary} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

/**
 * Welcome screen with app features and call-to-action
 */
export const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Icon name="verified-user" size={14} color={colors.secondary} />
            <Text style={styles.badgeText}>Trusted by 10k+ citizens</Text>
          </View>
          <View style={styles.logoContainer}>
            <Icon name="shield" size={80} color={colors.primary} />
            <View style={styles.pulseNode} />
          </View>
          <Text style={styles.title}>SafeAround</Text>
          <Text style={styles.tagline}>Your personal safety network, simplified.</Text>
        </View>

        <View style={styles.features}>
          <Feature
            icon="security"
            title="Intelligent Safety Path"
            description="Our AI analyzes live crime data to guide you through the safest possible routes."
          />
          <Feature
            icon="notifications-active"
            title="Instant SOS Network"
            description="One-tap emergency alerts to your inner circle with real-time location tracking."
          />
          <Feature
            icon="public"
            title="Community Vigilance"
            description="Stay protected with real-time reports from fellow citizens in your area."
          />
        </View>

        <View style={styles.actions}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => (navigation as any).navigate('Auth', { screen: 'Signup' })}
            style={styles.mainButton}
          >
            Secure Your Journey
          </Button>
          
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Part of the network? </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Auth', { screen: 'Login' })}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
    marginBottom: spacing['4xl'],
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    marginBottom: spacing['4xl'],
  },
  feature: {
    flexDirection: 'row',
    marginBottom: spacing['2xl'],
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
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  mainButton: {
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signInText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  signInLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 142, 62, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  logoContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pulseNode: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
    zIndex: -1,
  },
});
