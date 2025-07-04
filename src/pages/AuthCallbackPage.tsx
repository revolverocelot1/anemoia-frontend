import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const authSuccess = params.get('auth');

    // Handle demo authentication from render.com redirect
    if (authSuccess === 'success') {
      // For demo, create a mock JWT token
      const mockUser = {
        sub: 'demo_' + Date.now(),
        email: 'demo@example.com',
        name: 'Demo User',
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };
      
      // Create a simple JWT-like token (not cryptographically secure - just for demo)
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(mockUser));
      const mockToken = `${header}.${payload}.demo_signature`;
      
      setToken(mockToken);
      navigate('/account', { replace: true });
      return;
    }

    if (token) {
      setToken(token);
      navigate('/account', { replace: true });
    } else {
      // Failed – redirect to login with error
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [navigate, setToken]);

  return <LoadingOverlay message="Completing authentication..." />;
};

export default AuthCallbackPage; 