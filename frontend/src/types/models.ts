export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: number;
  userId?: number;
  name: string;
  phoneNumber: string;
  phone?: string; // Backend uses 'phone', frontend uses 'phoneNumber'
  relationship: string;
  isPrimary: boolean;
  is_priority?: boolean; // Backend uses 'is_priority'
  createdAt: string;
  created_at?: string; // Backend format
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  heading?: number;
}

export interface Alert {
  id: string;
  userId: string;
  type: 'panic' | 'check_in' | 'safe_zone';
  status: 'active' | 'responding' | 'resolved' | 'cancelled';
  location: Location;
  message?: string;
  currentRadius?: number;
  maxRadiusReached?: number;
  usersNotified?: number;
  emergencyNumber?: string;
  silentMode?: boolean;
  createdAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
}

export interface AlertTimelineEvent {
  id: string;
  alertId: string;
  eventType: string;
  radiusAtEvent: number;
  usersNotified: number;
  respondersCount: number;
  occurredAt: string;
}

export interface AlertDetails {
  alert: Alert;
  timeline: AlertTimelineEvent[];
  respondersCount: number;
  emergencyNumber: string;
  durationSeconds: number;
  emergencyServicesStatus: string;
  responders: AlertResponderSummary[];
  incidentReport: AlertIncidentReport;
}

export interface AlertResponderSummary {
  userId: string;
  name: string;
  phone?: string;
  responseStatus: string;
  distanceMeters: number;
  etaSeconds: number;
  respondedAt: string;
  arrivedAt?: string;
  responseRating?: number;
}

export interface AlertIncidentReport {
  alertId: string;
  requesterUserId: string;
  responderUserIds: string[];
  status: string;
  durationSeconds: number;
  createdAt: string;
  endedAt: string;
  currentRadius: number;
  maxRadiusReached: number;
  usersNotified: number;
  respondersCount: number;
  emergencyServicesStatus: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface DangerZone {
  id: string;
  location: Location;
  safetyScore: number;
  crimeCount: number;
  mostCommonCrimeType: string;
  radius: number;
  recentIncidents: Crime[];
}

export interface Crime {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: Location;
  description: string;
  date: string;
  source: 'police' | 'user';
  verified: boolean;
}

export interface HeatmapTile {
  z: number;
  x: number;
  y: number;
  url: string;
  data?: number[][];
}

export interface AreaStats {
  safetyScore: number;
  nearbyUsers: number;
  recentAlerts: number;
  crimeRate: number;
  lastUpdated: string;
}
