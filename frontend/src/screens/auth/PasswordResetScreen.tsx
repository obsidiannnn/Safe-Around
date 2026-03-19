import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type ResetStep = 'phone' | 'otp' | 'password';

/**
 * Password reset with 3-step OTP flow matching backend:
 * Step 1: Enter phone → POST /auth/otp/send
 * Step 2: Verify OTP  → POST /auth/otp/verify (logs in, gets token)
 * Step 3: New password → POST /auth/password/setup (using the token)
 */
export const PasswordResetScreen = () => {
  const navigation = useNavigation();
  const { sendOTP, verifyOTP, setupProfile, error, clearError } = useAuth();

  const [step, setStep] = useState<ResetStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendOTP = async () => {
    if (!phone) return;
    try {
      setIsSubmitting(true);
      clearError();
      await sendOTP(phone);
      setStep('otp');
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    try {
      setIsSubmitting(true);
      clearError();
      // This logs in the user and sets the access token in the store
      await verifyOTP(phone, otp);
      setStep('password');
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8 || newPassword !== confirmPassword) return;
    try {
      setIsSubmitting(true);
      clearError();
      // Use the token from verifyOTP to set new password (name/email kept blank for reset)
      await setupProfile({ name: '', email: '', password: newPassword });
      setSuccess(true);
      setTimeout(() => navigation.navigate('Login' as never), 2000);
    } catch (err) {
      // error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' && 'Enter your phone number to receive a verification code'}
            {step === 'otp' && `Enter the 6-digit code sent to ${phone}`}
            {step === 'password' && 'Create a new password for your account'}
          </Text>
        </View>

        {error && <Alert type="error" message={error} onDismiss={clearError} />}
        {success && <Alert type="success" message="Password reset successful! Redirecting..." />}

        <View style={styles.form}>

          {step === 'phone' && (
            <>
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+919119759509"
                leftIcon="phone"
                keyboardType="phone-pad"
                autoFocus
              />
              <Button variant="primary" size="large" fullWidth onPress={handleSendOTP} loading={isSubmitting}>
                Send OTP
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <Input
                label="Verification Code"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit code"
                maxLength={6}
                leftIcon="lock"
                keyboardType="number-pad"
                autoFocus
              />
              <Button variant="primary" size="large" fullWidth onPress={handleVerifyOTP} loading={isSubmitting}>
                Verify OTP
              </Button>
              <Button variant="ghost" size="medium" fullWidth onPress={handleSendOTP}>
                Resend Code
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 8 chars)"
                leftIcon="lock"
                autoFocus
              />
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                leftIcon="lock"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.mismatch}>Passwords do not match</Text>
              )}
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleResetPassword}
                loading={isSubmitting}
                disabled={newPassword !== confirmPassword || newPassword.length < 8}
              >
                Reset Password
              </Button>
            </>
          )}

          <Button variant="ghost" size="medium" fullWidth onPress={() => navigation.goBack()}>
            Back to Login
          </Button>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing['2xl'] },
  header: { marginTop: spacing['4xl'], marginBottom: spacing['3xl'] },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: 22 },
  form: { marginBottom: spacing['2xl'] },
  mismatch: {
    fontSize: fontSizes.xs,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
