import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text as RNText, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons as Icon } from '@expo/vector-icons';
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

  useFocusEffect(
    useCallback(() => {
      clearError();
    }, [clearError])
  );

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="shield" size={64} color={colors.primary} />
            <View style={styles.pulseNode} />
          </View>
          <Text style={styles.title}>Secure Login</Text>
          <Text style={styles.subtitle}>Enter your credentials to access your safety network.</Text>
        </View>

        {error && (
          <Alert type="error" message={error} onDismiss={clearError} />
        )}

        <View style={styles.form}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
            leftElement={
              <View style={styles.prefixContainer}>
                <RNText style={styles.prefixText}>+91</RNText>
              </View>
            }
            leftIcon="phone"
            autoFocus
            error={!phone ? undefined : phone.length < 10 ? 'Enter valid 10-digit number' : undefined}
          />
          <Input
            type="password"
            label="Security Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            leftIcon="lock"
          />

          <TouchableOpacity 
            onPress={() => navigation.navigate('PasswordReset' as never)}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={onSubmit}
            loading={isSubmitting}
            style={styles.loginButton}
          >
            Access My Account
          </Button>

          <View style={styles.trustFooter}>
            <Icon name="lock-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.trustText}>Your data is end-to-end encrypted</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            onPress={() => (navigation as any).navigate('Signup', { mode: 'login' })}
            style={styles.otpButton}
          >
            <Text style={styles.otpLoginText}>Login with Secure OTP</Text>
          </TouchableOpacity>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>New to SafeAround? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
              <Text style={styles.signUpLink}>Join the Network</Text>
            </TouchableOpacity>
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
    marginBottom: spacing['3xl'],
  },
  logoContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pulseNode: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
    zIndex: -1,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { 
    fontSize: fontSizes.md, 
    color: colors.textSecondary, 
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, // Updated to 24
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    ...shadows.large, // Deeper shadow
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  prefixContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingRight: 8, 
    marginRight: 8, 
    borderRightWidth: 1, 
    borderRightColor: colors.border 
  },
  prefixText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.textPrimary 
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  trustText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  otpButton: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  otpLoginText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signUpText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  signUpLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
});
