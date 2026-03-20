import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text as RNText } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type SignupStep = 'phone' | 'otp' | 'profile';

/**
 * Signup screen - 3 step OTP flow matching backend:
 * Step 1: Enter phone → POST /auth/otp/send
 * Step 2: Enter OTP  → POST /auth/otp/verify (creates user + JWT)
 * Step 3: Setup name/email/password → POST /auth/password/setup
 */
export const SignupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: { mode?: 'login' | 'signup' } }, 'params'>>();
  const mode = route.params?.mode || 'signup';
  
  const { sendOTP, verifyOTP, setupProfile, error, clearError } = useAuth();

  const [step, setStep] = useState<SignupStep>('phone');
  const [phone, setPhone] = useState(''); // user types 10-digit number
  const fullPhone = `+91${phone}`;         // computed E.164 format
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) return;
    try {
      setIsSubmitting(true);
      clearError();
      await sendOTP(fullPhone, mode);
      setStep('otp');
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    try {
      setIsSubmitting(true);
      clearError();
      await verifyOTP(fullPhone, otp);
      setStep('profile');
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Setup profile
  const handleSetupProfile = async () => {
    if (!acceptedTerms || password !== confirmPassword) return;
    try {
      setIsSubmitting(true);
      clearError();
      await setupProfile({ name, email, password });
      navigation.navigate('Permissions' as never);
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: '', color: colors.textSecondary };
    if (pwd.length < 8) return { strength: 'Weak', color: colors.error };
    const score = [/[A-Z]/, /[0-9]/, /[!@#$%^&*]/].filter((r) => r.test(pwd)).length;
    if (score === 3 && pwd.length >= 12) return { strength: 'Strong', color: colors.success };
    if (score >= 2) return { strength: 'Medium', color: colors.warning };
    return { strength: 'Weak', color: colors.error };
  };

  const pwdStrength = getPasswordStrength(password);

  const stepTitles = {
    phone: { title: mode === 'login' ? 'Login with OTP' : 'Create Account', subtitle: 'Enter your phone number to get started' },
    otp: { title: 'Verify Phone', subtitle: `Enter the 6-digit code sent to ${fullPhone}` },
    profile: { title: 'Set Up Profile', subtitle: 'Complete your account setup' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{stepTitles[step].title}</Text>
          <Text style={styles.subtitle}>{stepTitles[step].subtitle}</Text>
        </View>

        {error && <Alert type="error" message={error} onDismiss={clearError} />}

        <View style={styles.form}>

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <>
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
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleSendOTP}
                loading={isSubmitting}
              >
                Send OTP
              </Button>
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Text
                  style={styles.signInLink}
                  onPress={() => navigation.navigate('Login' as never)}
                >
                  Sign In
                </Text>
              </View>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <Input
                label="Verification Code"
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit OTP"
                leftIcon="lock"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleVerifyOTP}
                loading={isSubmitting}
              >
                Verify OTP
              </Button>
              <Button
                variant="ghost"
                size="medium"
                fullWidth
                onPress={handleSendOTP}
              >
                Resend Code
              </Button>
            </>
          )}

          {/* ── Step 3: Profile Setup ── */}
          {step === 'profile' && (
            <>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Aditya Kumar"
                leftIcon="person"
                autoFocus
              />
              <Input
                type="email"
                label="Email (Optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="aditya@example.com"
                leftIcon="email"
              />
              <Input
                type="password"
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                leftIcon="lock"
              />
              {password.length > 0 && (
                <Text style={[styles.passwordStrength, { color: pwdStrength.color }]}>
                  Strength: {pwdStrength.strength}
                </Text>
              )}
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                leftIcon="lock"
              />
              <View style={styles.termsContainer}>
                <Checkbox
                  status={acceptedTerms ? 'checked' : 'unchecked'}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  color={colors.primary}
                />
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleSetupProfile}
                loading={isSubmitting}
                disabled={!acceptedTerms || password !== confirmPassword}
              >
                Complete Sign Up
              </Button>
            </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing['2xl'], justifyContent: 'center' },
  header: { marginBottom: spacing['2xl'] },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: 22 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    ...shadows.medium,
  },
  passwordStrength: {
    fontSize: fontSizes.xs,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  termsText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  termsLink: { color: colors.primary, fontWeight: '600' },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signInText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  signInLink: {
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
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
