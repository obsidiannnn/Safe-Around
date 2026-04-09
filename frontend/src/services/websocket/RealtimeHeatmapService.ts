import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import { WEBSOCKET_URL } from '@/config/env';

class RealtimeHeatmapService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    this.socket = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time crime updates');
    });

    this.socket.on('crime_added', (data: any) => {
      console.log('🚨 New crime detected:', data);
      this.emit('crime_added', data);
      
      // Show an immediate visual notification to the user
      Alert.alert(
        '🚨 Safety Alert',
        `A new ${data.crime_type} has been reported in the area. Stay vigilant.`,
        [{ text: 'OK' }]
      );
    });

    this.socket.on('heatmap_refresh', (data: any) => {
      console.log('🗺️ Heatmap update received');
      this.emit('heatmap_refresh', data);
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from crime updates');
    });
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new RealtimeHeatmapService();
