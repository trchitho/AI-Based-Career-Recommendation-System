import api from "../lib/api";
import { Notification } from "../types/notification";

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const response = await api.get(`/api/notifications/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await api.put(`/api/notifications/${userId}/read-all`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },
};
