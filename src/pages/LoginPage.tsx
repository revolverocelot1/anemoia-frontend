import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

type AuthMode = 'signin' | 'signup' | 'reset';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState<'google' | 'twitter' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://anemoia-api.onrender.com';
    setIsLoading('google');
    window.location.href = `${apiBaseUrl}/auth/google`;
  };
  
  const handleTwitterLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://anemoia-api.onrender.com';
    setIsLoading('twitter');
    window.location.href = `${apiBaseUrl}/auth/twitter`;
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading('email');
    
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const response = await authService.signup({ email, password, name });
        setToken(response.token);
        setSuccess('Account created! Check your email for verification.');
        setTimeout(() => navigate('/account'), 2000);
      } else if (mode === 'signin') {
        const response = await authService.login({ email, password });
        setToken(response.token);
        navigate('/');
      } else if (mode === 'reset') {
        await authService.requestPasswordReset(email);
        setSuccess(`Password reset link sent to ${email}`);
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[80vh] px-4 py-20 relative">
      {/* Star Wars style background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-pulse"></div>
      </div>
      
      <motion.div 
        className="bg-gray-900/80 backdrop-blur-lg rounded-xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Holographic corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-cyan-400/30"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-cyan-400/30"></div>
        
        {/* Mode Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800/50 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setMode('signin')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signup' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
        <button
              onClick={() => setMode('reset')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'reset' 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Reset
            </button>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          {mode === 'signin' && 'Welcome Back'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'reset' && 'Reset Password'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {mode === 'signin' && 'Sign in to access your tools'}
          {mode === 'signup' && 'Join Anemoia to start creating'}
          {mode === 'reset' && 'Enter your email to reset password'}
        </p>
        
        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
          >
            {success}
          </motion.div>
        )}
        
        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            required
          />
          
          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              required
              minLength={6}
            />
          )}
          
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              required
              minLength={6}
            />
          )}
          
          <motion.button
            type="submit"
            disabled={isLoading !== null}
            className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading === 'email' ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Link'}
              </>
            )}
          </motion.button>
        </form>
        
        {mode === 'signup' && (
          <p className="text-xs text-gray-400 mb-6">
            Test emails will be sent to: <span className="text-cyan-400">{email || 'your-email'}@mc639.testmail.app</span>
          </p>
        )}
        
        <div className="space-y-4">
          {/* Google Login Button */}
          <motion.button
            onClick={handleGoogleLogin}
            disabled={isLoading !== null}
            className="group w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-700 rounded-lg shadow-sm text-base font-medium text-white bg-gray-800 hover:bg-gray-700 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 48 48">
                <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"/>
                <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"/>
                <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"/>
                <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,36.096,44,30.693,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"/>
          </svg>
            )}
          Continue with Google
          </motion.button>
          
          {/* Twitter/X Login Button */}
          <motion.button
            onClick={handleTwitterLogin}
            disabled={isLoading !== null}
            className="group w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-700 rounded-lg shadow-sm text-base font-medium text-white bg-gray-800 hover:bg-gray-700 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading === 'twitter' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            )}
            Continue with X (Twitter)
          </motion.button>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Secure authentication</span>
          </div>
      </div>
        
        <p className="text-xs text-gray-500">
          You will be redirected to your chosen provider to complete authentication. 
          Your data remains private and secure.
        </p>
      </motion.div>
    </main>
  );
};

export default LoginPage; 