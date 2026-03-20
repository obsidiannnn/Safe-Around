import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text as RNText } from 'react-native';
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
  const fullPhone = `+91${phone}`;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!phone || !password) return;
    try {
      setIsSubmitting(true);
      clearError();
      // Backend: POST /api/v1/auth/login with { phone, password }
      await logIn({ phone: fullPhone, password });
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
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <RNText style={styles.prefixText}>+91</RNText>
            </View>
            <View style={styles.phoneInput}>
              <Input
                label=""
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="10-digit number"
                leftIcon="phone"
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
            </View>
          </View>

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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  prefixBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefixText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
  },
});
