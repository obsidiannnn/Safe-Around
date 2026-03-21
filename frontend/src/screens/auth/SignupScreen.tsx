import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text as RNText, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons as Icon } from '@expo/vector-icons';
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

  useFocusEffect(
    useCallback(() => {
      // Clear any global errors when landing on this screen
      clearError();
    }, [clearError])
  );
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {step === 'phone' && (
            <View style={styles.logoContainer}>
              <Icon name="shield" size={64} color={colors.primary} />
              <View style={styles.pulseNode} />
            </View>
          )}
          <Text style={styles.title}>{stepTitles[step].title}</Text>
          <Text style={styles.subtitle}>{stepTitles[step].subtitle}</Text>
        </View>

        {error && <Alert type="error" message={error} onDismiss={clearError} />}

        <View style={styles.form}>

          {/* ── Step 1: Phone (Join the Network) ── */}
          {step === 'phone' && (
            <>
              <Input
                label="Primary Phone Number"
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
              />
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleSendOTP}
                loading={isSubmitting}
                style={styles.mainButton}
              >
                Request Access Code
              </Button>

              <View style={styles.trustFooter}>
                <Icon name="verified-user" size={12} color={colors.secondary} />
                <Text style={[styles.trustText, { color: colors.secondary }]}>Join 10,000+ protected citizens</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Part of the network? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                  <Text style={styles.signInLink}>Secure Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: OTP (Verification) ── */}
          {step === 'otp' && (
            <>
              <Input
                label="Secure Access Code"
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
                style={styles.mainButton}
              >
                Verify & Join
              </Button>
              <TouchableOpacity onPress={handleSendOTP} style={styles.resendButton}>
                <Text style={styles.resendText}>Didn't receive code? Resend</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: Profile Setup (Secure Your Identity) ── */}
          {step === 'profile' && (
            <>
              <Input
                label="Display Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name for safety alerts"
                leftIcon="person"
                autoFocus
              />
              <Input
                type="email"
                label="Verify Email (Optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="safety@example.com"
                leftIcon="email"
              />
              <Input
                type="password"
                label="Security Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a strong password"
                leftIcon="lock"
              />
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={[styles.strengthBar, { width: pwdStrength.strength === 'Strong' ? '100%' : pwdStrength.strength === 'Medium' ? '60%' : '30%', backgroundColor: pwdStrength.color }]} />
                  <Text style={[styles.passwordStrength, { color: pwdStrength.color }]}>
                    {pwdStrength.strength} Security
                  </Text>
                </View>
              )}
              <Input
                type="password"
                label="Confirm Security Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Verify password"
                leftIcon="lock"
              />
              <View style={styles.termsContainer}>
                <Checkbox
                  status={acceptedTerms ? 'checked' : 'unchecked'}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  color={colors.primary}
                />
                <Text style={styles.termsText}>
                  I confirm my commitment to the{' '}
                  <Text style={styles.termsLink}>Safety Guidelines</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Charter</Text>
                </Text>
              </View>
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleSetupProfile}
                loading={isSubmitting}
                disabled={!acceptedTerms || password !== confirmPassword}
                style={styles.mainButton}
              >
                Create Secure Profile
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
  header: { 
    alignItems: 'center',
    marginBottom: spacing['3xl'] 
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
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: fontSizes.md, 
    color: colors.textSecondary, 
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border,
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
  mainButton: {
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  strengthContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrength: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
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
  termsLink: { color: colors.primary, fontWeight: '700' },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signInText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  signInLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
});
