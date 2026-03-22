import io from 'socket.io-client';

class CrimeWebSocketService {
  private socket: any = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(serverUrl: string) {
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to crime updates');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from crime updates');
    });

    // Listen for crime updates and emergency alerts from server
    this.socket.on('message', (data: string) => {
      try {
        const payload = JSON.parse(data);
        const { event, data: eventData } = payload;
        
        switch (event) {
          case 'crime_added':
          case 'new_crime':
            this.emit('crime_added', eventData || payload);
            break;
          case 'emergency_alert':
            this.emit('emergency_alert', eventData);
            break;
          case 'responder_accepted':
            this.emit('responder_accepted', eventData);
            break;
          case 'radius_expanded':
            this.emit('radius_expanded', eventData);
            break;
          case 'connected':
            console.log('WS Connection data:', eventData);
            break;
          default:
            console.log('Unhandled WS event:', event);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
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

export default new CrimeWebSocketService();
