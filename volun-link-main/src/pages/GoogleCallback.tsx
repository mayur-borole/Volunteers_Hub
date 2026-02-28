import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      if (error) {
        // Handle error
        if (error === 'auth_failed') {
          toast.error('Google authentication failed. Please try again.');
        } else if (error === 'account_blocked') {
          toast.error('Your account has been blocked. Please contact support.');
        } else {
          toast.error('Authentication error occurred.');
        }
        navigate('/login');
        return;
      }

      if (token && refreshToken) {
        try {
          // Save tokens
          authService.handleGoogleCallback(token, refreshToken);
          
          // Refresh user data
          await refreshUser();
          
          toast.success('Successfully signed in with Google!');
          navigate('/dashboard');
        } catch (error) {
          console.error('Google callback error:', error);
          toast.error('Failed to complete sign in. Please try again.');
          navigate('/login');
        }
      } else {
        toast.error('Invalid authentication response.');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we authenticate you.</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
