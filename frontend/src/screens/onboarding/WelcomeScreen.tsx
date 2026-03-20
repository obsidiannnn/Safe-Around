import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface FeatureProps {
  icon: string;
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.title}>SafeAround</Text>
        <Text style={styles.tagline}>Your Personal Safety Network</Text>
      </View>

      <View style={styles.features}>
        <Feature
          icon="map"
          title="Real-time Crime Heatmap"
          description="Stay informed about safety levels in your area with live crime data"
        />
        <Feature
          icon="warning"
          title="Emergency SOS Alerts"
          description="Instantly alert your emergency contacts with your location in critical situations"
        />
        <Feature
          icon="people"
          title="Community Safety Network"
          description="Connect with trusted contacts and build your personal safety circle"
        />
      </View>

        <View style={styles.actions}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={() => (navigation as any).navigate('Auth', { screen: 'Signup' })}
        >
          Get Started
        </Button>
        
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <Text
            style={styles.signInLink}
            onPress={() => (navigation as any).navigate('Auth', { screen: 'Login' })}
          >
            Sign In
          </Text>
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
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signInText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  signInLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
