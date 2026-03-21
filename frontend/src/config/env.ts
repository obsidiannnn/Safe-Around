import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = () => {
  // If running via Expo Go, dynamically get the host machine's LAN IP
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(':')[0]; // Extracts '10.110.153.103'
  }
  
  // Fallbacks for simulators
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const devHost = getDevHost();

// Use __DEV__ (set by Metro bundler) rather than NODE_ENV for reliable dev vs prod detection in React Native.
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const config = {
  dev: {
    API_URL: `http://${devHost}:8000/api/v1`,
    WEBSOCKET_URL: `ws://${devHost}:8000`,
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY',
  },
  prod: {
    API_URL: 'https://api.safearound.app/api/v1',
    WEBSOCKET_URL: 'wss://ws.safearound.app',
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBfi1CO-cAF0aJBxktzJLQYwq2IuzqXVMY',
  },
};

const env = IS_DEV ? config.dev : config.prod;

export const API_URL = env.API_URL;
export const WEBSOCKET_URL = env.WEBSOCKET_URL;
export const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
