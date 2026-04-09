import { apiClient } from './client';
import { Alert, AlertDetails, AlertIncidentReport, AlertResponderSummary, AlertTimelineEvent } from '@/types/models';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CreateAlertRequest {
  type: 'panic' | 'check_in' | 'safe_zone';
  location: {
    latitude: number;
    longitude: number;
  };
  silentMode: boolean;
  message?: string;
  audioUrl?: string;
}

export interface AlertResponse {
  alertId: string;
  status: string;
  notifiedUsers: number;
}

const normalizeAlert = (raw: any): Alert => ({
  id: String(raw?.id ?? raw?.alert_id ?? ''),
  userId: String(raw?.userId ?? raw?.user_id ?? ''),
  type: raw?.type ?? raw?.alert_type ?? 'panic',
  status: raw?.status ?? raw?.alert_status ?? 'active',
  location: raw?.location ?? raw?.alert_location ?? {
    latitude: raw?.latitude ?? 0,
    longitude: raw?.longitude ?? 0,
  },
  message: (() => {
    const payload = raw?.message ?? raw?.metadata;
    if (typeof payload !== 'string') {
      return payload;
    }

    try {
      const parsed = JSON.parse(payload);
      return parsed?.message ?? payload;
    } catch {
      return payload;
    }
  })(),
  currentRadius: raw?.currentRadius ?? raw?.current_radius ?? 100,
  maxRadiusReached: raw?.maxRadiusReached ?? raw?.max_radius_reached,
  usersNotified: raw?.usersNotified ?? raw?.users_notified ?? 0,
  emergencyNumber: raw?.emergencyNumber ?? raw?.emergency_number ?? '112',
  silentMode: raw?.silentMode ?? raw?.silent_mode ?? false,
  createdAt: raw?.createdAt ?? raw?.created_at ?? new Date().toISOString(),
  resolvedAt: raw?.resolvedAt ?? raw?.resolved_at,
});

const normalizeTimelineEvent = (raw: any): AlertTimelineEvent => ({
  id: String(raw?.id ?? ''),
  alertId: String(raw?.alertId ?? raw?.alert_id ?? ''),
  eventType: raw?.eventType ?? raw?.event_type ?? '',
  radiusAtEvent: raw?.radiusAtEvent ?? raw?.radius_at_event ?? 0,
  usersNotified: raw?.usersNotified ?? raw?.users_notified ?? 0,
  respondersCount: raw?.respondersCount ?? raw?.responders_count ?? 0,
  occurredAt: raw?.occurredAt ?? raw?.occurred_at ?? new Date().toISOString(),
});

const normalizeResponder = (raw: any): AlertResponderSummary => ({
  userId: String(raw?.userId ?? raw?.user_id ?? ''),
  name: raw?.name ?? 'Verified responder',
  phone: raw?.phone,
  responseStatus: raw?.responseStatus ?? raw?.response_status ?? 'accepted',
  distanceMeters: Number(raw?.distanceMeters ?? raw?.distance_meters ?? 0),
  etaSeconds: Number(raw?.etaSeconds ?? raw?.eta_seconds ?? 0),
  respondedAt: raw?.respondedAt ?? raw?.responded_at ?? new Date().toISOString(),
  arrivedAt: raw?.arrivedAt ?? raw?.arrived_at,
  responseRating: raw?.responseRating ?? raw?.response_rating,
});

const normalizeIncidentReport = (raw: any): AlertIncidentReport => ({
  alertId: String(raw?.alertId ?? raw?.alert_id ?? ''),
  status: raw?.status ?? 'resolved',
  durationSeconds: Number(raw?.durationSeconds ?? raw?.duration_seconds ?? 0),
  createdAt: raw?.createdAt ?? raw?.created_at ?? new Date().toISOString(),
  endedAt: raw?.endedAt ?? raw?.ended_at ?? new Date().toISOString(),
  currentRadius: Number(raw?.currentRadius ?? raw?.current_radius ?? 0),
  maxRadiusReached: Number(raw?.maxRadiusReached ?? raw?.max_radius_reached ?? 0),
  usersNotified: Number(raw?.usersNotified ?? raw?.users_notified ?? 0),
  respondersCount: Number(raw?.respondersCount ?? raw?.responders_count ?? 0),
  emergencyServicesStatus: raw?.emergencyServicesStatus ?? raw?.emergency_services_status ?? 'Not contacted',
});

export const alertService = {
  /**
   * Create a new emergency alert
   */
  createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
    const response = await apiClient.post<ApiResponse<Alert> & { alert?: any }>('/alerts', {
      alert_type: data.type,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      silent_mode: data.silentMode,
      metadata: data.message
    });
    const alert = response.data.data ?? response.data.alert;
    if (!alert) {
      throw new Error(response.data.error || 'Emergency alert was not returned by the server');
    }
    return normalizeAlert(alert);
  },

  /**
   * Get alert details by ID
   */
  getAlert: async (id: string): Promise<Alert> => {
    const response = await apiClient.get<ApiResponse<any>>(`/alerts/${id}`);
    const payload = response.data.data?.alert ?? response.data.data;
    return normalizeAlert(payload);
  },

  getAlertDetails: async (id: string): Promise<AlertDetails> => {
    const response = await apiClient.get<ApiResponse<any>>(`/alerts/${id}`);
    const payload = response.data.data;
    return {
      alert: normalizeAlert(payload?.alert),
      timeline: (payload?.timeline || []).map(normalizeTimelineEvent),
      respondersCount: payload?.respondersCount ?? payload?.responders_count ?? 0,
      emergencyNumber: payload?.emergency_number ?? payload?.alert?.emergency_number ?? '112',
      durationSeconds: Number(payload?.durationSeconds ?? payload?.duration_seconds ?? 0),
      emergencyServicesStatus: payload?.emergencyServicesStatus ?? payload?.emergency_services_status ?? 'Not contacted',
      responders: (payload?.responders || []).map(normalizeResponder),
      incidentReport: normalizeIncidentReport(payload?.incidentReport ?? payload?.incident_report ?? {}),
    };
  },

  /**
   * Update alert status
   */
  updateAlertStatus: async (
    id: string,
    status: 'active' | 'resolved' | 'cancelled'
  ): Promise<Alert> => {
    const response = await apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/status`, {
      status,
    });
    return normalizeAlert(response.data.data);
  },

  /**
   * Respond to an alert
   */
  respondToAlert: async (
    id: string,
    location: { latitude: number; longitude: number }
  ): Promise<AlertResponse> => {
    const response = await apiClient.post<ApiResponse<AlertResponse>>(
      `/alerts/${id}/respond`,
      { 
        latitude: location.latitude,
        longitude: location.longitude 
      }
    );
    return response.data.data!;
  },

  /**
   * Get active alerts within radius
   */
  getActiveAlerts: async (
    location: { latitude: number; longitude: number },
    radius: number
  ): Promise<Alert[]> => {
    const response = await apiClient.get<ApiResponse<Alert[]>>('/alerts/active', {
      params: {
        lat: location.latitude,
        lng: location.longitude,
        radius,
      },
    });
    return (response.data.data || []).map(normalizeAlert);
  },

  /**
   * Escalate alert to emergency services
   */
  escalateAlert: async (id: string, type: 'police' | 'medical' | 'fire'): Promise<void> => {
    await apiClient.post(`/alerts/${id}/escalate`, { escalation_type: type });
  },

  /**
   * Get alert history
   */
  getAlertHistory: async (): Promise<Alert[]> => {
    const response = await apiClient.get<ApiResponse<Alert[]>>('/alerts/history');
    return (response.data.data || []).map(normalizeAlert);
  },
};
