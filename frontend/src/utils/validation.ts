import { z } from 'zod';

// Base schemas
export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid phone number with country code (e.g. +919119759509)')
  .min(10, 'Phone number must be at least 10 digits');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const fullNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// ── Auth Form Schemas (aligned to backend) ──────────────────────────────────

// Step 1 of OTP flow: just phone
export const sendOTPSchema = z.object({
  phone: phoneSchema,
});

// Step 2 of OTP flow: phone + otp
export const verifyOTPSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

// Profile setup after OTP verify (POST /auth/password/setup)
export const setupProfileSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Direct login: phone + password (POST /auth/login)
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Other Schemas ────────────────────────────────────────────────────────────

export const emergencyContactSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  relationship: z.string().min(2, 'Relationship is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Please choose a new password different from your current password',
  path: ['newPassword'],
});

// ── Type Exports ─────────────────────────────────────────────────────────────
export type SendOTPFormData = z.infer<typeof sendOTPSchema>;
export type VerifyOTPFormData = z.infer<typeof verifyOTPSchema>;
export type SetupProfileFormData = z.infer<typeof setupProfileSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Legacy aliases for backward compat with any still-existing imports
export const registerSchema = setupProfileSchema;
export type RegisterFormData = SetupProfileFormData;
export const phoneNumberSchema = phoneSchema;
