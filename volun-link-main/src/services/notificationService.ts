import api from '../lib/api';

export interface Notification {
  _id: string;
  user: string;
  message: string;
  type: 'registration' | 'approval' | 'update' | 'cancellation' | 'reminder' | 'feedback' | 'system' | 'message';
  relatedEvent?: {
    _id: string;
    title: string;
    date: string;
  };
  relatedUser?: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const notificationService = {
  // Get user notifications
  getNotifications: async (page?: number, limit?: number) => {
    const response = await api.get('/notifications', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  // Delete all read notifications
  deleteReadNotifications: async () => {
    const response = await api.delete('/notifications/delete-read');
    return response.data;
  },

  // Get notification settings
  getNotificationSettings: async () => {
    const response = await api.get('/notifications/settings');
    return response.data;
  },
};
