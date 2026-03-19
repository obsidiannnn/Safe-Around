import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendUser, LoginRequest, SetupProfileRequest } from '@/types/api';
import { authService } from '@/services/api/authService';

// AsyncStorage keys
const KEYS = {
  user: 'auth:user',
  accessToken: 'auth:accessToken',
  refreshToken: 'auth:refreshToken',
};

interface AuthState {
  user: BackendUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: BackendUser | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;

  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<void>;
  setupProfile: (data: SetupProfileRequest) => Promise<void>;
  logIn: (data: LoginRequest) => Promise<void>;
  logOut: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  loadPersistedAuth: () => Promise<void>;
  clearError: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(KEYS.user);
    }
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    AsyncStorage.setItem(KEYS.accessToken, accessToken);
    AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
  },

  sendOTP: async (phone) => {
    try {
      set({ error: null });
      await authService.sendOTP(phone);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to send OTP';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  verifyOTP: async (phone, otp) => {
    try {
      set({ error: null });
      const response = await authService.verifyOTP(phone, otp);
      get().setTokens(response.tokens.access, response.tokens.refresh);
      get().setUser(response.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'OTP verification failed';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setupProfile: async (data) => {
    try {
      set({ error: null });
      const token = get().accessToken;
      if (!token) throw new Error('Not authenticated');
      const result = await authService.setupProfile(data, token);
      get().setUser(result.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Profile setup failed';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  logIn: async (data) => {
    try {
      set({ error: null });
      const response = await authService.login(data);
      get().setTokens(response.tokens.access, response.tokens.refresh);
      get().setUser(response.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  logOut: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      await AsyncStorage.multiRemove([KEYS.user, KEYS.accessToken, KEYS.refreshToken]);
    }
  },

  refreshAccessToken: async () => {
    try {
      const currentRefreshToken = get().refreshToken;
      if (!currentRefreshToken) throw new Error('No refresh token');
      const tokens = await authService.refreshToken(currentRefreshToken);
      get().setTokens(tokens.access, tokens.refresh);
    } catch (error) {
      console.error('Token refresh failed:', error);
      get().logOut();
    }
  },

  loadPersistedAuth: async () => {
    try {
      const [userStr, accessToken, refreshToken] = await AsyncStorage.multiGet([
        KEYS.user,
        KEYS.accessToken,
        KEYS.refreshToken,
      ]);

      const user = userStr[1] ? JSON.parse(userStr[1]) : null;
      const access = accessToken[1];
      const refresh = refreshToken[1];

      if (user && access && refresh) {
        set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to load persisted auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  setError: (error) => set({ error }),
}));
