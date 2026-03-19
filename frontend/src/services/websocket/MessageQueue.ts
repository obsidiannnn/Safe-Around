import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'websocket_message_queue';

interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  retries: number;
}

/**
 * Message queue for offline WebSocket messages
 * Stores messages when offline and sends when connection restored
 */
class MessageQueue {
  private static instance: MessageQueue;
  private queue: QueuedMessage[] = [];

  private constructor() {
    this.loadQueue();
  }

  static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue();
    }
    return MessageQueue.instance;
  }

  async add(event: string, data: any): Promise<void> {
    const message: QueuedMessage = {
      id: Date.now().toString(),
      event,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(message);
    await this.saveQueue();
  }

  async processQueue(sendFn: (event: string, data: any) => void): Promise<void> {
    const messages = [...this.queue];
    this.queue = [];

    for (const message of messages) {
      try {
        sendFn(message.event, message.data);
      } catch (error) {
        if (message.retries < 3) {
          message.retries++;
          this.queue.push(message);
        }
      }
    }

    await this.saveQueue();
  }

  async clear(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  getSize(): number {
    return this.queue.length;
  }

  private async loadQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading message queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving message queue:', error);
    }
  }
}

export const messageQueue = MessageQueue.getInstance();
