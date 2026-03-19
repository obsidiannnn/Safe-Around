import { useEffect, useCallback } from 'react';
import { useWebSocketStore } from '@/store/websocketStore';
import { webSocketService } from '@/services/websocket/WebSocketService';

/**
 * Custom hook for WebSocket communication
 * Provides subscribe/unsubscribe and send functionality
 */
export const useWebSocket = () => {
  const { isConnected, connectionStatus, sendMessage } = useWebSocketStore();

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
