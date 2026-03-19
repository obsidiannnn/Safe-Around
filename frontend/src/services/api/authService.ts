import { apiClient } from './client';
import { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from '@/types/api';

export interface TokenResponse {
  token: string;
  refreshToken: string;
}

export const authService = {
  signup: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<ApiResponse<TokenResponse>>('/auth/refresh', {
      refreshToken,
    });
    return response.data.data!;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return authService.signup(data);
  },
};
