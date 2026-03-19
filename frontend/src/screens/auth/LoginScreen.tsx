import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

/**
 * Login screen: phone + password direct login
 * For OTP-based login → use SignupScreen (same OTP flow logs in existing users)
 */
export const LoginScreen = () => {
  const navigation = useNavigation();
  const { logIn, error, clearError } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!phone || !password) return;
    try {
      setIsSubmitting(true);
      clearError();
      // Backend: POST /api/v1/auth/login with { phone, password }
      await logIn({ phone, password });
      // Navigation handled by AppNavigator based on auth state
    } catch (err) {
      // Error is handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to SafeAround</Text>
        </View>

        {error && (
          <Alert type="error" message={error} onDismiss={clearError} />
        )}

        <View style={styles.form}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+919119759509"
            leftIcon="phone"
            keyboardType="phone-pad"
            autoFocus
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            leftIcon="lock"
          />

          <Text
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('PasswordReset' as never)}
          >
            Forgot Password?
          </Text>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={onSubmit}
            loading={isSubmitting}
          >
            Sign In
          </Button>

          <Text
            style={styles.otpLoginText}
            onPress={() => navigation.navigate('Signup' as never)}
          >
            Login with OTP instead
          </Text>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Text
              style={styles.signUpLink}
              onPress={() => navigation.navigate('Signup' as never)}
            >
              Sign Up
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing['2xl'], justifyContent: 'center' },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: { fontSize: 64, marginBottom: spacing.md },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    ...shadows.medium,
  },
  forgotPassword: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: spacing.xl,
  },
  otpLoginText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signUpText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  signUpLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
