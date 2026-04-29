class CrimeWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectTimer: any = null;
  private serverUrl: string = '';
  private shouldReconnect: boolean = false;

  connect(serverUrl: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (!serverUrl || !/^wss?:\/\//i.test(serverUrl)) {
      console.warn('Crime websocket startup skipped because the URL is invalid.');
      return;
    }
    this.serverUrl = serverUrl;
    this.shouldReconnect = true;
    try {
      this.socket = new WebSocket(serverUrl);
    } catch (error) {
      console.warn('Crime websocket could not be created right now; retry will happen later.', error);
      this.socket = null;
      if (this.shouldReconnect) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(this.serverUrl), 3000);
      }
      return;
    }

    this.socket.onopen = () => {
      console.log('✅ Connected to crime updates via native WebSocket');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.socket.onclose = () => {
      console.log('❌ Disconnected from crime updates');
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(this.serverUrl), 3000);
      }
    };

    this.socket.onerror = (error) => {
      console.warn('WebSocket connection unavailable; realtime updates will retry in the background.', error);
    };

    // Listen for crime updates and emergency alerts from server
    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data: eventData } = payload;
        
        switch (eventName) {
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
          case 'nearby_users_updated':
            this.emit('nearby_users_updated', eventData);
            break;
          case 'connected':
            if (eventData) {
              console.log('WS Connection data:', eventData);
            }
            break;
          case 'room_closed':
            this.emit('room_closed', eventData);
            break;
          default:
            console.log('Unhandled WS event:', eventName);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
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
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default new CrimeWebSocketService();
