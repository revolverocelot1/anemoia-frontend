import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { motion } from 'framer-motion';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle Supabase OAuth callback
        const { user, error } = await authService.handleOAuthCallback();
        
        if (error) {
          throw error;
        }
        
        if (!user) {
          throw new Error('No user data received');
        }
        
        // Success - redirect to subtitle page
        navigate('/subtitle');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setIsLoading(false);
        
        // Redirect to login after delay
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <main className="flex items-center justify-center min-h-[80vh] px-4 py-20">
      <motion.div 
        className="bg-gray-900/80 backdrop-blur-lg rounded-xl shadow-2xl p-8 w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-white">Completing authentication...</h2>
            <p className="text-gray-400">Please wait while we log you in</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Authentication Failed</h2>
            <p className="text-red-400">{error}</p>
            <p className="text-gray-400 text-sm">Redirecting to login page...</p>
          </div>
        ) : null}
      </motion.div>
    </main>
  );
};

export default OAuthCallbackPage; 