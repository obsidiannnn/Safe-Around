export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Backend: POST /api/v1/auth/otp/send
export interface SendOTPRequest {
  phone: string;
}

// Backend: POST /api/v1/auth/otp/verify
export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

// Backend: POST /api/v1/auth/login
export interface LoginRequest {
  phone: string;
  password: string;
}

// Backend: POST /api/v1/auth/password/setup
export interface SetupProfileRequest {
  name: string;
  email: string;
  password: string;
}

// Backend: POST /api/v1/auth/refresh
export interface RefreshRequest {
  refresh_token: string;
}

// Backend User shape (matches models.User serialization)
export interface BackendUser {
  id: number;
  name?: string;
  phone: string;
  email?: string;
  is_phone_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Backend Auth Response (from VerifyOTP and Login)
export interface AuthResponse {
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: BackendUser;
}

// Legacy - kept for compatibility with existing components
export interface RegisterRequest extends SetupProfileRequest {
  phone: string;
}

