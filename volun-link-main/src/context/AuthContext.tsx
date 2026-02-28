import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import { disconnectSocket } from '@/lib/socket';

export type UserRole = 'volunteer' | 'organizer' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  skills?: string[];
  interests?: string[];
  availability?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isBlocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('helpinghands-token');
      const savedUser = localStorage.getItem('helpinghands-user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching current user
          const response = await authService.getCurrentUser();
          if (response.success && response.user) {
            const userData: User = {
              id: response.user._id || response.user.id,
              name: response.user.name,
              email: response.user.email,
              role: response.user.role,
              avatar: response.user.profileImage,
              skills: response.user.skills,
              interests: response.user.interests,
              availability: response.user.availability,
              phone: response.user.phone,
              bio: response.user.bio,
              profileImage: response.user.profileImage,
              isBlocked: response.user.isBlocked,
            };
            setUser(userData);
            localStorage.setItem('helpinghands-user', JSON.stringify(userData));
          }
        } catch (error) {
          // Token invalid, clear storage
          console.error('Auth initialization error:', error);
          localStorage.removeItem('helpinghands-token');
          localStorage.removeItem('helpinghands-refresh-token');
          localStorage.removeItem('helpinghands-user');
          disconnectSocket();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      
      if (response.success) {
        const userData: User = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.profileImage,
          skills: response.user.skills,
          interests: response.user.interests,
          availability: response.user.availability,
          phone: response.user.phone,
          bio: response.user.bio,
          profileImage: response.user.profileImage,
          isBlocked: response.user.isBlocked,
        };

        // Store tokens and user data
        localStorage.setItem('helpinghands-token', response.accessToken);
        localStorage.setItem('helpinghands-refresh-token', response.refreshToken);
        localStorage.setItem('helpinghands-user', JSON.stringify(userData));
        
        setUser(userData);
        toast.success(response.message || 'Login successful!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      if (!error.response) {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
      }
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const response = await authService.register({
        name,
        email,
        password,
        role,
        skills: [],
        interests: [],
        availability: 'flexible',
      });

      if (response.success) {
        const userData: User = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.profileImage,
          skills: response.user.skills,
          interests: response.user.interests,
          availability: response.user.availability,
          phone: response.user.phone,
          bio: response.user.bio,
          profileImage: response.user.profileImage,
          isBlocked: response.user.isBlocked,
        };

        // Store tokens and user data
        localStorage.setItem('helpinghands-token', response.accessToken);
        localStorage.setItem('helpinghands-refresh-token', response.refreshToken);
        localStorage.setItem('helpinghands-user', JSON.stringify(userData));
        
        setUser(userData);
        toast.success(response.message || 'Registration successful!');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      if (!error.response) {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
      }
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      disconnectSocket();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.user) {
        const userData: User = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.profileImage,
          skills: response.user.skills,
          interests: response.user.interests,
          availability: response.user.availability,
          phone: response.user.phone,
          bio: response.user.bio,
          profileImage: response.user.profileImage,
          isBlocked: response.user.isBlocked,
        };
        setUser(userData);
        localStorage.setItem('helpinghands-user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
