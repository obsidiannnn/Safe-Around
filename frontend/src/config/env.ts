import { Platform } from 'react-native';

// On Android emulator: localhost → 10.0.2.2 (host machine's IP)
// On iOS simulator: localhost works fine
const getLocalhost = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const localhost = getLocalhost();

const config = {
  development: {
    API_URL: `http://${localhost}:8000/api/v1`,
    WEBSOCKET_URL: `ws://${localhost}:8000`,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  production: {
    API_URL: 'https://api.safearound.com/api/v1',
    WEBSOCKET_URL: 'wss://ws.safearound.com',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  },
};

const ENV = process.env.NODE_ENV || 'development';

export const API_URL = config[ENV as keyof typeof config].API_URL;
export const WEBSOCKET_URL = config[ENV as keyof typeof config].WEBSOCKET_URL;
export const GOOGLE_MAPS_API_KEY = config[ENV as keyof typeof config].GOOGLE_MAPS_API_KEY;
