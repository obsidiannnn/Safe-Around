import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '@/config/env';

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

/**
 * Singleton WebSocket service using Socket.IO
 * Handles real-time communication with automatic reconnection
 */
class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private token: string | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private pingInterval: NodeJS.Timeout | null = null;
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(token: string): void {
    if (this.socket && (this.socket.connected || this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.RECONNECTING)) {
      return;
    }

    this.token = token;
    this.updateStatus(ConnectionStatus.CONNECTING);

    this.socket = io(WEBSOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.setupEventListeners();
    this.startHeartbeat();
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus(ConnectionStatus.DISCONNECTED);
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.updateStatus(ConnectionStatus.CONNECTED);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.updateStatus(ConnectionStatus.DISCONNECTED);
    });

    this.socket.on('reconnect_attempt', () => {
      console.log('WebSocket reconnecting...');
      this.updateStatus(ConnectionStatus.RECONNECTING);
    });

    this.socket.on('reconnect', () => {
      console.log('WebSocket reconnected');
      this.updateStatus(ConnectionStatus.CONNECTED);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('pong', () => {
      // Heartbeat received
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }
}

export const webSocketService = WebSocketService.getInstance();
