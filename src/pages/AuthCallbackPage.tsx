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
        // Get the session from the URL hash
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