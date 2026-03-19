import { apiClient } from './client';
import {
  SendOTPRequest,
  VerifyOTPRequest,
  LoginRequest,
  SetupProfileRequest,
  AuthResponse,
  BackendUser,
} from '@/types/api';

export const authService = {
  // Step 1: Request OTP (Signup or Login via OTP)
  sendOTP: async (phone: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/otp/send', { phone } as SendOTPRequest);
    return response.data;
  },

  // Step 2: Verify OTP - creates/logs in user and returns JWT tokens
  verifyOTP: async (phone: string, otp: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/otp/verify', { phone, otp } as VerifyOTPRequest);
    return response.data;
  },

  // Step 3 (optional): Setup name, email, password after OTP
  setupProfile: async (data: SetupProfileRequest, accessToken: string): Promise<{ message: string; user: BackendUser }> => {
    const response = await apiClient.post<{ message: string; user: BackendUser }>(
      '/auth/password/setup',
      data,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  },

  // Direct Login with phone + password (for returning users who set up password)
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // Refresh access token using refresh token
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh: string }> => {
    const response = await apiClient.post<{ tokens: { access: string; refresh: string } }>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data.tokens;
  },
};

