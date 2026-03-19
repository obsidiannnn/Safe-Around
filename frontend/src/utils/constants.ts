export const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
export const WS_URL = process.env.WS_URL || 'ws://localhost:8000';
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export const ALERT_TYPES = {
  PANIC: 'panic',
  CHECK_IN: 'check_in',
  SAFE_ZONE: 'safe_zone',
} as const;

export const ALERT_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
} as const;

export const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
export const BACKGROUND_LOCATION_TASK = 'background-location-task';
