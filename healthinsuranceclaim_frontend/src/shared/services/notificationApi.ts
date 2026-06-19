import { apiClient } from './apiClient';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: number;
  isRead: boolean;
  createdAt: string;
}

export type { Notification as NotificationType };

export const notificationApi = {
  getNotifications: async (): Promise<Notification[]> => {
    try {
      return await apiClient.get<Notification[]>('/api/notifications');
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  markAsRead: async (id: number): Promise<void> => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }
};