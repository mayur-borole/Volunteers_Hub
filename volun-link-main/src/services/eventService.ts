import api from '../lib/api';

export interface Event {
  _id: string;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  date: string;
  startTime?: string;
  endTime?: string;
  instructionsForVolunteers?: string;
  maxVolunteers: number;
  present?: boolean;
  attendanceMarkedAt?: string | null;
  workDuration?: string;
  certificateGenerated?: boolean;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  volunteers: any[];
  approvedVolunteers?: any[];
  registrations?: EventRegistration[];
  myRegistration?: EventRegistration;
  approved: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
  images?: string[];
  imageUrl?: string;
  category: string;
  averageRating: number;
  totalRatings: number;
  totalRegistrations: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  availableSpots?: number;
  isFull?: boolean;
  attendanceLocked?: boolean;
}

export interface EventRegistration {
  volunteerId: string | { _id: string; name?: string; email?: string; phone?: string };
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  cancellationReason?: string;
  rejectionReason?: string;
  reviewedAt?: string | null;
  // Attendance details set by organizer after event completion
  present?: boolean;
  attendanceMarkedAt?: string | null;
  workDuration?: string;
  certificateGenerated?: boolean;
  // Rating & feedback
  organizerRating?: number | null;
  volunteerFeedback?: string;
  volunteerRatingForEvent?: number | null;
  certificateUrl?: string | null;
  createdAt?: string;
}

export interface EventRegistrationRequest {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phone: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  registrationDeadline?: string;
  maxVolunteers: number;
  instructionsForVolunteers?: string;
  category?: string;
  images?: string[];
  imageUrl?: string;
  notes?: string;
}

export interface EventFilters {
  location?: string;
  date?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  approved?: string;
}

export const eventService = {
  // Get all events with filters
  getAllEvents: async (filters?: EventFilters) => {
    const response = await api.get('/events', { params: filters });
    return response.data;
  },

  // Get single event by ID
  getEventById: async (id: string) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Create new event (Organizer)
  createEvent: async (data: CreateEventRequest) => {
    const response = await api.post('/events', data);
    return response.data;
  },

  // Update event (Organizer/Admin)
  updateEvent: async (id: string, data: Partial<CreateEventRequest>) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  // Delete event (Organizer/Admin)
  deleteEvent: async (id: string) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  // Mark event as completed (Organizer/Admin)
  completeEvent: async (id: string) => {
    const response = await api.put(`/events/${id}/complete`);
    return response.data;
  },

  // Register for event (Volunteer)
  registerForEvent: async (id: string, payload: EventRegistrationRequest) => {
    const response = await api.post(`/events/${id}/register`, payload);
    return response.data;
  },

  // Cancel registration (Volunteer)
  cancelRegistration: async (id: string, reason: string) => {
    const response = await api.post(`/events/${id}/cancel`, { reason });
    return response.data;
  },

  // Get my events (Organizer)
  getMyEvents: async () => {
    const response = await api.get('/events/user/my-events');
    return response.data;
  },

  // Get registered events (Volunteer)
  getRegisteredEvents: async () => {
    const response = await api.get('/events/user/registered');
    return response.data;
  },

  // Get applied events (Volunteer) - alias endpoint
  getAppliedEvents: async () => {
    const response = await api.get('/events/applied');
    return response.data;
  },

  // Organizer registration moderation
  approveRegistration: async (eventId: string, volunteerId: string) => {
    const response = await api.patch(`/events/${eventId}/registrations/${volunteerId}/approve`);
    return response.data;
  },

  rejectRegistration: async (eventId: string, volunteerId: string, reason?: string) => {
    const response = await api.patch(`/events/${eventId}/registrations/${volunteerId}/reject`, { reason });
    return response.data;
  },

  removeRegistration: async (eventId: string, volunteerId: string) => {
    const response = await api.delete(`/events/${eventId}/registrations/${volunteerId}`);
    return response.data;
  },

  // Update attendance for a volunteer on an event
  updateAttendance: async (
    eventId: string,
    payload: { volunteerId: string; present: boolean; workDuration?: string }
  ) => {
    const response = await api.put(`/events/${eventId}/attendance`, payload);
    return response.data;
  },

  // Approve event (Admin)
  approveEvent: async (id: string) => {
    const response = await api.patch(`/events/${id}/approve`);
    return response.data;
  },

  // Reject event (Admin)
  rejectEvent: async (id: string, reason?: string) => {
    const response = await api.patch(`/events/${id}/reject`, { reason });
    return response.data;
  },

  // Generate certificate for a volunteer (Organizer/Admin)
  generateCertificate: async (eventId: string, volunteerId: string, hours?: number) => {
    const payload =
      typeof hours === 'number' && hours > 0
        ? { hoursOverride: hours }
        : {};
    const response = await api.post(`/events/${eventId}/certificate/${volunteerId}`, payload);
    return response.data;
  },

  // Rate a volunteer on an event (Organizer)
  rateVolunteer: async (eventId: string, volunteerId: string, rating: number) => {
    const response = await api.post(`/events/${eventId}/rate-volunteer`, { volunteerId, rating });
    return response.data;
  },

  // Submit volunteer feedback for an event (Volunteer)
  submitVolunteerFeedback: async (eventId: string, rating: number, feedback: string) => {
    const response = await api.post(`/events/${eventId}/volunteer-feedback`, { rating, feedback });
    return response.data;
  },

  // Get completed events for the logged-in volunteer
  getCompletedEventsForVolunteer: async () => {
    const response = await api.get('/events/completed-for-volunteer');
    return response.data;
  },

  // Finalize attendance and generate certificates for all present volunteers
  finalizeAttendance: async (eventId: string) => {
    const response = await api.post(`/events/${eventId}/attendance/finalize`);
    return response.data;
  },
};
