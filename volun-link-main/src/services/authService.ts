import api from '../lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'volunteer' | 'organizer' | 'admin';
  skills?: string[];
  interests?: string[];
  availability?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    id: string;
    name: string;
    email: string;
    role: 'volunteer' | 'organizer' | 'admin';
    skills?: string[];
    interests?: string[];
    availability?: string;
    phone?: string;
    bio?: string;
    profileImage?: string;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export const authService = {
  // Register new user
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('helpinghands-token');
      localStorage.removeItem('helpinghands-refresh-token');
      localStorage.removeItem('helpinghands-user');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update password
  updatePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/update-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Google OAuth login - redirects to backend OAuth flow
  loginWithGoogle: () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiUrl.replace('/api', '');
    window.location.href = `${baseUrl}/api/auth/google`;
  },

  // Handle Google OAuth callback (save tokens from URL)
  handleGoogleCallback: (token: string, refreshToken: string) => {
    localStorage.setItem('helpinghands-token', token);
    localStorage.setItem('helpinghands-refresh-token', refreshToken);
  },
};
