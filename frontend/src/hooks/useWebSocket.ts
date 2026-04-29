import { useEffect, useCallback } from 'react';
import { useWebSocketStore } from '@/store/websocketStore';
import { webSocketService, ConnectionStatus } from '@/services/websocket/WebSocketService';
import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook for WebSocket communication
 * Provides subscribe/unsubscribe and send functionality
 */
export const useWebSocket = () => {
  const { isConnected, connectionStatus, sendMessage, connect } = useWebSocketStore();
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (
      isAuthenticated &&
      accessToken &&
      connectionStatus === ConnectionStatus.DISCONNECTED
    ) {
      connect(accessToken);
    }
  }, [accessToken, connect, connectionStatus, isAuthenticated]);

  const subscribe = useCallback((event: string, callback: (...args: any[]) => void) => {
    webSocketService.on(event, callback);
  }, []);

  const unsubscribe = useCallback((event: string, callback?: (...args: any[]) => void) => {
    webSocketService.off(event, callback);
  }, []);

  const send = useCallback((event: string, data: any) => {
    sendMessage(event, data);
  }, [sendMessage]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    send,
    subscribe,
    unsubscribe,
  };
};
