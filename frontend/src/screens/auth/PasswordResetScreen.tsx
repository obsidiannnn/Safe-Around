import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Alert } from '@/components/common';
import { PhoneInput } from '@/components/forms';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type ResetStep = 'phone' | 'otp' | 'password';

/**
 * Password reset screen with 3-step flow
 * Step 1: Enter phone, Step 2: Enter OTP, Step 3: New password
 */
export const PasswordResetScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState<ResetStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // TODO: Call API to send OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // TODO: Call API to verify OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep('password');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // TODO: Call API to reset password
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => {
        navigation.navigate('Login' as never);
      }, 2000);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
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
            {step === 'otp' && 'Enter the 6-digit code sent to your phone'}
            {step === 'password' && 'Create a new password for your account'}
          </Text>
        </View>

        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <Alert type="success" message="Password reset successful! Redirecting..." />}

        <View style={styles.form}>
          {step === 'phone' && (
            <>
              <PhoneInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleSendOTP}
                loading={isSubmitting}
              >
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

          {step === 'password' && (
            <>
              <Input
                type="password"
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
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
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleResetPassword}
                loading={isSubmitting}
              >
                Reset Password
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="medium"
            fullWidth
            onPress={() => navigation.goBack()}
          >
            Back to Login
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing['2xl'],
  },
  header: {
    marginTop: spacing['4xl'],
    marginBottom: spacing['3xl'],
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
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing['2xl'],
  },
});
