import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      // Failed – just redirect home with error for now
      navigate('/', { replace: true });
    }
  }, [navigate, setToken]);

  return null; // Could show spinner
};

export default AuthCallbackPage; 