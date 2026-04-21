import api from '../lib/api';

export interface ChatMessage {
  id: number;
  room_id: string;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatRoom {
  room_id: string;
  other_user_id: number;
  other_name: string;
  last_message: string;
  last_at: string;
  unread: number;
}

class ChatService {
  async getMessages(otherUserId: number): Promise<ChatMessage[]> {
    const res = await api.get(`/api/chat/${otherUserId}/messages`);
    return res.data;
  }

  async sendMessage(otherUserId: number, content: string): Promise<ChatMessage> {
    const res = await api.post(`/api/chat/${otherUserId}/send`, { content });
    return res.data;
  }

  async getRooms(): Promise<ChatRoom[]> {
    const res = await api.get('/api/chat/rooms');
    return res.data;
  }

  openSocket(roomId: string, onMessage: (msg: ChatMessage) => void): WebSocket {
    const token = localStorage.getItem('accessToken') || '';
    const wsBase = window.location.origin.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/ws/chat/${roomId}?token=${token}`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') onMessage(data as ChatMessage);
      } catch { /* ignore */ }
    };
    return ws;
  }
}

export const chatService = new ChatService();
