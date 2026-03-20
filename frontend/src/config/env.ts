import { Platform } from 'react-native';

// On Android emulator: localhost → 10.0.2.2 (host machine IP)
// On iOS simulator: localhost works fine
const getLocalhost = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const localhost = getLocalhost();

// Use __DEV__ (set by Metro bundler) rather than NODE_ENV for reliable dev vs prod detection in React Native.
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const config = {
  dev: {
    API_URL: `http://${localhost}:8080/api/v1`,
    WEBSOCKET_URL: `ws://${localhost}:8080`,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  prod: {
    API_URL: 'https://api.safearound.app/api/v1',
    WEBSOCKET_URL: 'wss://ws.safearound.app',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
};

const env = IS_DEV ? config.dev : config.prod;

export const API_URL = env.API_URL;
export const WEBSOCKET_URL = env.WEBSOCKET_URL;
export const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
