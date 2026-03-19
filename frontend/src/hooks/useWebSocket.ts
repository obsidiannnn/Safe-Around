import { useEffect } from 'react';
import { socketService } from '@/services/websocket/socketService';
import { useAuthStore } from '@/store/authStore';

export const useWebSocket = () => {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  return {
    emit: socketService.emit.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
    isConnected: socketService.isConnected.bind(socketService),
  };
};
