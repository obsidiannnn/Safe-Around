import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { User } from '@/types/models';
import { authService } from '@/services/api/authService';
import { LoginFormData, RegisterFormData } from '@/utils/validation';

const storage = new MMKV({
  id: 'auth-storage',
  encryptionKey: 'safearound-secure-key',
});

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  signUp: (data: RegisterFormData) => Promise<void>;
  logIn: (data: LoginFormData) => Promise<void>;
  logOut: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  loadPersistedAuth: () => void;
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

  signUp: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
      });
      
      get().setTokens(response.token, response.refreshToken);
      get().setUser(response.user);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Sign up failed';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },

  logIn: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(data);
      
      get().setTokens(response.token, response.refreshToken);
      get().setUser(response.user);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ error: errorMessage });
      throw new Error(errorMessage);
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

      const response = await authService.refreshToken(currentRefreshToken);
      get().setTokens(response.token, response.refreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      get().logOut();
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const currentUser = get().user;
      if (!currentUser) throw new Error('No user logged in');

      const updatedUser = { ...currentUser, ...data };
      get().setUser(updatedUser);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },

  loadPersistedAuth: () => {
    try {
      const userStr = storage.getString('user');
      const accessToken = storage.getString('accessToken');
      const refreshToken = storage.getString('refreshToken');

      if (userStr && accessToken && refreshToken) {
        const user = JSON.parse(userStr);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Failed to load persisted auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (error) => set({ error }),
}));
