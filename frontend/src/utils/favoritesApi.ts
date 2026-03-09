import api from '../utils/api';

export interface Favorite {
  id: string;
  user_id: string;
  type: 'tournament' | 'team';
  reference_id: string;
  notifications_enabled: boolean;
  created_at: string;
  details?: any;
}

export const favoritesApi = {
  // Get all user favorites
  async getFavorites(): Promise<Favorite[]> {
    const response = await api.get('/favorites');
    return response.data;
  },

  // Check if item is favorited
  async checkFavorite(type: 'tournament' | 'team', referenceId: string): Promise<{ is_favorite: boolean; notifications_enabled: boolean }> {
    const response = await api.get(`/favorites/check/${type}/${referenceId}`);
    return response.data;
  },

  // Add to favorites
  async addFavorite(type: 'tournament' | 'team', referenceId: string, notificationsEnabled: boolean = true): Promise<{ id: string; message: string }> {
    const response = await api.post('/favorites', {
      type,
      reference_id: referenceId,
      notifications_enabled: notificationsEnabled,
    });
    return response.data;
  },

  // Remove from favorites
  async removeFavorite(type: 'tournament' | 'team', referenceId: string): Promise<{ message: string }> {
    const response = await api.delete(`/favorites/${type}/${referenceId}`);
    return response.data;
  },

  // Update favorite notifications setting
  async updateFavoriteNotifications(favoriteId: string, notificationsEnabled: boolean): Promise<{ message: string }> {
    const response = await api.put(`/favorites/${favoriteId}`, {
      notifications_enabled: notificationsEnabled,
    });
    return response.data;
  },

  // Get global notification settings
  async getNotificationSettings(): Promise<{ notifications_enabled: boolean }> {
    const response = await api.get('/users/notification-settings');
    return response.data;
  },

  // Update global notification settings
  async updateNotificationSettings(notificationsEnabled: boolean): Promise<{ message: string }> {
    const response = await api.put('/users/notification-settings', {
      notifications_enabled: notificationsEnabled,
    });
    return response.data;
  },
};
