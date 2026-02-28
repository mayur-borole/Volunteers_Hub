import api from '../lib/api';

export interface MessagePayload {
  eventId: string;
  recipientId: string;
  content: string;
}

export interface Message {
  _id: string;
  event: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  recipient: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const messageService = {
  sendMessage: async (payload: MessagePayload) => {
    const response = await api.post('/messages/send', payload);
    return response.data as Message;
  },

  getConversation: async (eventId: string, userId: string) => {
    const response = await api.get(`/messages/conversation/${eventId}/${userId}`);
    return response.data as Message[];
  },

  getEventMessages: async (eventId: string) => {
    const response = await api.get(`/messages/event/${eventId}`);
    return response.data as Message[];
  },

  markAsRead: async (messageId: string) => {
    const response = await api.put(`/messages/${messageId}/read`);
    return response.data as Message;
  },

  getUnreadCount: async () => {
    const response = await api.get('/messages/unread/count');
    return response.data as { count: number };
  }
};
