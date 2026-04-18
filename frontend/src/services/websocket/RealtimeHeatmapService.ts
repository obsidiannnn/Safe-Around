import { Alert } from 'react-native';
import { WEBSOCKET_URL } from '@/config/env';

class RealtimeHeatmapService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;

  connect() {
    const wsUrl = `${WEBSOCKET_URL}/ws/crime`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('✅ Connected to real-time crime updates');
      this.reconnectDelay = 1000; // Reset reconnect delay on successful connection
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventType, data } = message;

        if (eventType === 'crime_added') {
          console.log('🚨 New crime detected:', data);
          this.emit('crime_added', data);
          
          // Show an immediate visual notification to the user
          Alert.alert(
            '🚨 Safety Alert',
            `A new ${data.crime_type} has been reported in the area. Stay vigilant.`,
            [{ text: 'OK' }]
          );
        } else if (eventType === 'heatmap_refresh') {
          console.log('🗺️ Heatmap update received');
          this.emit('heatmap_refresh', data);
        } else if (eventType === 'connected') {
          console.log('📡 WebSocket handshake complete');
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.warn('WebSocket connection unavailable; realtime updates will retry in the background.', error);
    };
    
    this.socket.onclose = () => {
      console.log('❌ Disconnected from crime updates');
      // Auto-reconnect
      this.reconnectTimeout = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        this.connect();
      }, this.reconnectDelay);
      // Exponential backoff (max 30 seconds)
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    this.listeners.set(event, callbacks.filter(cb => cb !== callback));
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default new RealtimeHeatmapService();
