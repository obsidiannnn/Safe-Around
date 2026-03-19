import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { BackendUser, LoginRequest, SetupProfileRequest } from '@/types/api';
import { authService } from '@/services/api/authService';

const storage = new MMKV({
  id: 'auth-storage',
  encryptionKey: 'safearound-secure-key',
});

interface AuthState {
  user: BackendUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: BackendUser | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;

  // OTP Flow Step 1: send OTP to phone
  sendOTP: (phone: string) => Promise<void>;

  // OTP Flow Step 2: verify OTP → creates/logs in user, returns JWT
  verifyOTP: (phone: string, otp: string) => Promise<void>;

  // OTP Flow Step 3 (optional): set name/email/password
  setupProfile: (data: SetupProfileRequest) => Promise<void>;

  // Direct password login (returning users who set a password)
  logIn: (data: LoginRequest) => Promise<void>;

  logOut: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  loadPersistedAuth: () => void;
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
      storage.set('user', JSON.stringify(user));
    } else {
      storage.delete('user');
    }
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
  },

  sendOTP: async (phone) => {
    try {
      set({ isLoading: true, error: null });
      await authService.sendOTP(phone);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to send OTP';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOTP: async (phone, otp) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.verifyOTP(phone, otp);
      // Backend: { tokens: { access, refresh }, user: BackendUser }
      get().setTokens(response.tokens.access, response.tokens.refresh);
      get().setUser(response.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'OTP verification failed';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  setupProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const token = get().accessToken;
      if (!token) throw new Error('Not authenticated');
      const result = await authService.setupProfile(data, token);
      get().setUser(result.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Profile setup failed';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  logIn: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(data);
      // Backend: { tokens: { access, refresh }, user: BackendUser }
      get().setTokens(response.tokens.access, response.tokens.refresh);
      get().setUser(response.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  logOut: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      storage.delete('user');
      storage.delete('accessToken');
      storage.delete('refreshToken');
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

  loadPersistedAuth: () => {
    try {
      const userStr = storage.getString('user');
      const accessToken = storage.getString('accessToken');
      const refreshToken = storage.getString('refreshToken');

      if (userStr && accessToken && refreshToken) {
        const user = JSON.parse(userStr);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
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
