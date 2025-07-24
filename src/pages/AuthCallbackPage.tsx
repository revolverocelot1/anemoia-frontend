import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingFallback from '../components/LoadingFallback';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have authentication parameters in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        console.log('AuthCallbackPage: Processing auth callback', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasError: !!error,
          errorDescription
        });

        // Handle auth errors
        if (error) {
          console.error('Auth error:', error, errorDescription);
          navigate('/login?error=' + encodeURIComponent(errorDescription || error));
          return;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('Error setting session:', sessionError);
            navigate('/login?error=' + encodeURIComponent(sessionError.message));
            return;
          }
          
          console.log('Session set successfully:', data);
          
          // Clean up the URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Redirect to home page or intended destination
          const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectTo);
        } else {
          // If no tokens in hash, check if we already have a session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Existing session found, redirecting to home');
            navigate('/');
          } else {
            console.log('No tokens found, redirecting to login');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/login?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <LoadingFallback message="Completing sign in..." />;
} 