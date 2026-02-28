import api from '../lib/api';

export interface Feedback {
  _id: string;
  event: string;
  volunteer: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  rating: number;
  comment: string;
  isApproved: boolean;
  flaggedAsInappropriate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackRequest {
  event: string;
  rating: number;
  comment: string;
}

export const feedbackService = {
  // Submit feedback (Volunteer)
  createFeedback: async (data: CreateFeedbackRequest) => {
    const response = await api.post('/feedback', data);
    return response.data;
  },

  // Get feedback for an event
  getEventFeedback: async (eventId: string) => {
    const response = await api.get(`/feedback/event/${eventId}`);
    return response.data;
  },

  // Get my feedback (Volunteer)
  getMyFeedback: async () => {
    const response = await api.get('/feedback/my-feedback');
    return response.data;
  },

  // Update feedback (Volunteer)
  updateFeedback: async (id: string, data: Partial<CreateFeedbackRequest>) => {
    const response = await api.put(`/feedback/${id}`, data);
    return response.data;
  },

  // Delete feedback (Volunteer/Admin)
  deleteFeedback: async (id: string) => {
    const response = await api.delete(`/feedback/${id}`);
    return response.data;
  },

  // Flag feedback as inappropriate (Admin)
  flagFeedback: async (id: string) => {
    const response = await api.patch(`/feedback/${id}/flag`);
    return response.data;
  },

  // Get all feedback (Admin)
  getAllFeedback: async (page?: number, limit?: number) => {
    const response = await api.get('/feedback/admin/all', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get feedback statistics (Admin)
  getFeedbackStats: async () => {
    const response = await api.get('/feedback/stats');
    return response.data;
  },
};
