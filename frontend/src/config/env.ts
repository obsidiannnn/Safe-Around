import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }
  if (process.env.API_URL) {
    const match = process.env.API_URL.match(/http:\/\/([^:/]+)/);
    if (match) return match[1];
  }
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const devHost = getDevHost();

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const normalizeOptionalConfig = (value?: string) => {
  if (!value || /^your[-_]/i.test(value)) {
    return '';
  }
  return value;
};

// API_URL and WS_URL come from .env files via EXPO_PUBLIC_ prefix
// .env.development and .env.production both have these set to Railway URL
const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || '';
const WS_URL_FROM_ENV = process.env.EXPO_PUBLIC_WS_URL || process.env.WS_URL || '';

const config = {
  dev: {
    API_URL: API_URL_FROM_ENV || `http://${devHost}:8000/api/v1`,
    WEBSOCKET_URL: WS_URL_FROM_ENV || `ws://${devHost}:8000`,
    GOOGLE_MAPS_API_KEY: normalizeOptionalConfig(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
  },
  prod: {
    API_URL: API_URL_FROM_ENV || 'https://safearound-backend-production.up.railway.app/api/v1',
    WEBSOCKET_URL: WS_URL_FROM_ENV || 'wss://safearound-backend-production.up.railway.app',
    GOOGLE_MAPS_API_KEY: normalizeOptionalConfig(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
  },
};

const env = IS_DEV ? config.dev : config.prod;

export const API_URL = env.API_URL;
export const WEBSOCKET_URL = env.WEBSOCKET_URL;
export const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
