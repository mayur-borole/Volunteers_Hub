import api from '../lib/api';

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  availability?: string;
  profileImage?: string;
}

export const userService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Get my certificates (volunteer)
  getMyCertificates: async () => {
    const response = await api.get('/users/my-certificates');
    return response.data;
  },

  // Delete one of my certificates (volunteer)
  deleteMyCertificate: async (certificateId: string) => {
    const response = await api.delete(`/users/my-certificates/${certificateId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileRequest) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  // Get all users (Admin)
  getAllUsers: async (page?: number, limit?: number) => {
    const response = await api.get('/users', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get user by ID (Admin)
  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Block/Unblock user (Admin)
  toggleBlockUser: async (id: string) => {
    const response = await api.patch(`/users/block/${id}`);
    return response.data;
  },

  // Delete user (Admin)
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Get volunteers by skills (Organizer)
  getVolunteersBySkills: async (skills: string[]) => {
    const response = await api.get('/users/volunteers/by-skills', {
      params: { skills: skills.join(',') },
    });
    return response.data;
  },

  // Get user statistics (Admin)
  getUserStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },
};
