import { create } from 'zustand';
import { webSocketService, ConnectionStatus } from '@/services/websocket/WebSocketService';
import { messageQueue } from '@/services/websocket/MessageQueue';

interface Message {
  id: string;
  event: string;
  data: any;
  timestamp: number;
}

interface WebSocketState {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastMessage: Message | null;
  activeRooms: string[];
  connect: (token: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (event: string, data: any) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastMessage: (message: Message) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  lastMessage: null,
  activeRooms: [],

  connect: (token: string) => {
    webSocketService.connect(token);
    
    webSocketService.onStatusChange((status) => {
      set({
        connectionStatus: status,
        isConnected: status === ConnectionStatus.CONNECTED,
      });

      if (status === ConnectionStatus.CONNECTED) {
        messageQueue.processQueue((event, data) => {
          webSocketService.emit(event, data);
        });
      }
    });
  },

  disconnect: () => {
    webSocketService.disconnect();
    set({ activeRooms: [] });
  },

  joinRoom: (roomId: string) => {
    webSocketService.emit('join_room', { room_id: roomId });
    set((state) => ({
      activeRooms: [...state.activeRooms, roomId],
    }));
  },

  leaveRoom: (roomId: string) => {
    webSocketService.emit('leave_room', { room_id: roomId });
    set((state) => ({
      activeRooms: state.activeRooms.filter((id) => id !== roomId),
    }));
  },

  sendMessage: (event: string, data: any) => {
    const { isConnected } = get();
    
    if (isConnected) {
      webSocketService.emit(event, data);
    } else {
      messageQueue.add(event, data);
    }
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setLastMessage: (message) => set({ lastMessage: message }),
}));
