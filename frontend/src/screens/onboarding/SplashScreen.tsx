import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/typography';
import { useAuth } from '@/hooks/useAuth';

/**
 * Splash screen with animated logo
 * Auto-navigates based on authentication state
 */
export const SplashScreen = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading } = useAuth();
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo
    scale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    opacity.value = withSpring(1);

    // Navigate after animation
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          navigation.navigate('Main' as never);
        } else {
          navigation.navigate('Welcome' as never);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.title}>SafeAround</Text>
        <Text style={styles.tagline}>Your Personal Safety Network</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 8,
  },
  tagline: {
    fontSize: fontSizes.md,
    color: colors.surface,
    opacity: 0.9,
  },
});
