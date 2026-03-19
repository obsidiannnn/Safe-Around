import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api/authService';
import { LoginRequest, RegisterRequest } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const { user, token, isAuthenticated, setUser, setToken, logout: logoutStore } = useAuthStore();

  const login = async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setToken(response.token);
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);
  };

  const register = async (data: RegisterRequest) => {
    const response = await authService.register(data);
    setUser(response.user);
    setToken(response.token);
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logoutStore();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
    }
  };

  const loadStoredAuth = async () => {
    const storedToken = await AsyncStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    loadStoredAuth,
  };
};
