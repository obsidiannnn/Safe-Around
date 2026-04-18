import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Image, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const brandIcon = require('../../../assets/icon.png');
const progressTrackWidth = 190;

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message, onLayout }) => {
  const logoPulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0.22)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 0.92,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.28,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );

    pulseLoop.start();
    progressLoop.start();

    return () => {
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [logoPulse, progress, visible]);

  const logoScale = useMemo(
    () =>
      logoPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.045],
      }),
    [logoPulse]
  );

  const glowOpacity = useMemo(
    () =>
      logoPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.45],
      }),
    [logoPulse]
  );

  const progressWidth = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [42, progressTrackWidth],
      }),
    [progress]
  );

  if (!visible) return null;

  return (
    <View style={styles.screen} onLayout={onLayout}>
      <StatusBar style="dark" />

      <View style={[styles.ambientShape, styles.topLeftShape]} />
      <View style={[styles.ambientShape, styles.topRightShape]} />
      <View style={[styles.ambientShape, styles.bottomRightShape]} />
      <View style={styles.gridCircleOuter} />
      <View style={styles.gridCircleInner} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoGlow, { opacity: glowOpacity, transform: [{ scale: logoScale }] }]} />

        <Animated.View style={[styles.brandCard, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoBadge}>
            <Image source={brandIcon} style={styles.logoImage} resizeMode="cover" />
          </View>

          <View style={styles.brandTextWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, styles.titlePrimary]}>Safe</Text>
              <Text style={[styles.title, styles.titleSecondary]}>Around</Text>
            </View>
            <Text style={styles.tagline}>Safety in your circle</Text>
          </View>
        </Animated.View>

        <Text style={styles.protocolLabel}>GUARDIAN PROTOCOL ACTIVE</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.message}>
          {message || 'Preparing your live safety network'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Always ready when safety matters</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ambientShape: {
    position: 'absolute',
    backgroundColor: 'rgba(45, 90, 240, 0.05)',
    borderRadius: 999,
  },
  topLeftShape: {
    width: 220,
    height: 220,
    top: -70,
    left: -60,
  },
  topRightShape: {
    width: 180,
    height: 180,
    top: 80,
    right: -50,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  bottomRightShape: {
    width: 260,
    height: 260,
    bottom: -120,
    right: -90,
    backgroundColor: 'rgba(45, 90, 240, 0.06)',
  },
  gridCircleOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(45, 90, 240, 0.08)',
    bottom: -60,
    right: -80,
  },
  gridCircleInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(45, 90, 240, 0.06)',
    top: 110,
    left: -70,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.xl,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(45, 90, 240, 0.12)',
    top: 12,
  },
  brandCard: {
    width: '100%',
    maxWidth: 290,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 28,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
    ...theme.shadows.premium,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  logoImage: {
    width: 78,
    height: 78,
    borderRadius: 22,
  },
  brandTextWrap: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  titlePrimary: {
    color: theme.colors.primary,
  },
  titleSecondary: {
    color: theme.colors.secondary,
  },
  tagline: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  protocolLabel: {
    marginTop: theme.spacing['3xl'],
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: 'rgba(107, 114, 128, 0.9)',
    letterSpacing: 3.2,
    textAlign: 'center',
  },
  progressTrack: {
    width: progressTrackWidth,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 90, 240, 0.10)',
    overflow: 'hidden',
    marginTop: theme.spacing.xl,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  message: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(107, 114, 128, 0.85)',
    letterSpacing: 0.6,
  },
});
