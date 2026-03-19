import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { QuickReplyButtons } from '@/components/chat/QuickReplyButtons';
import { TypingIndicator } from '@/components/realtime/TypingIndicator';
import { ConnectionStatusBar } from '@/components/realtime/ConnectionStatusBar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { theme } from '@/theme';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: 'text' | 'location';
  timestamp: number;
  status: 'sending' | 'sent' | 'read';
}

interface ChatScreenProps {
  route: { params: { alertId: string; roomId: string } };
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route }) => {
  const { alertId, roomId } = route.params;
  const { user } = useAuthStore();
  const { send, subscribe, unsubscribe, connectionStatus } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    send('join_room', { room_id: roomId, user_role: 'victim' });

    const handleMessage = (data: any) => {
      const newMessage: Message = {
        id: data.message_id,
        senderId: data.sender_id,
        senderName: data.sender_name,
        message: data.message,
        messageType: 'text',
        timestamp: data.timestamp,
        status: 'read',
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    const handleTyping = (data: { user_id: string; user_name: string }) => {
      if (data.user_id !== user?.id) {
        setTypingUser(data.user_name);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    subscribe('chat_message', handleMessage);
    subscribe('user_typing', handleTyping);

    return () => {
      unsubscribe('chat_message', handleMessage);
      unsubscribe('user_typing', handleTyping);
      send('leave_room', { room_id: roomId });
    };
  }, [roomId]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      senderName: `${user?.firstName} ${user?.lastName}`,
      message: inputText,
      messageType: 'text',
      timestamp: Date.now(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, message]);
    send('chat_message', {
      room_id: roomId,
      message: inputText,
      message_type: 'text',
    });

    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConnectionStatusBar status={connectionStatus} />
      
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === user?.id}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {isTyping && typingUser && <TypingIndicator userName={typingUser} />}

        <QuickReplyButtons onSelect={handleQuickReply} />

        <View style={styles.inputContainer}>
          <Input
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            style={styles.input}
          />
          <Button variant="primary" onPress={handleSend}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  messageList: {
    padding: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
  },
});
