import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingOverlay from '../components/LoadingOverlay';

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Supabase OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash parameters (Supabase uses hash-based routing for auth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Set the session manually if we have tokens in the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            navigate('/login?error=auth_failed', { replace: true });
            return;
          }
          
          if (data.session) {
            // Successfully authenticated
            navigate('/account', { replace: true });
            return;
          }
        }
        
        // If no tokens in hash, try to get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login?error=auth_failed', { replace: true });
          return;
        }

        if (session) {
          // Successfully authenticated
          navigate('/account', { replace: true });
        } else {
          // No session found
          navigate('/login?error=no_session', { replace: true });
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        navigate('/login?error=unexpected', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <LoadingOverlay message="Completing authentication..." />;
};

export default AuthCallbackPage; 