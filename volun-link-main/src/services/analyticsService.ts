import api from '../lib/api';

export const analyticsService = {
  // Get volunteer statistics
  getVolunteerStats: async () => {
    const response = await api.get('/analytics/volunteer');
    return response.data;
  },

  // Get organizer statistics
  getOrganizerStats: async () => {
    const response = await api.get('/analytics/organizer');
    return response.data;
  },

  // Get admin statistics
  getAdminStats: async () => {
    const response = await api.get('/analytics/admin');
    return response.data;
  },

  // Get public platform overview
  getPlatformOverview: async () => {
    const response = await api.get('/analytics/overview');
    return response.data;
  },
};
