import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

interface UserProfile {
  anemoId: string;
  email: string;
  name: string;
  picture: string;
  joinDate: string;
  lastLogin: string;
  totalProcessed: number;
  favoriteTools: string[];
}

export default function AccountPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Generate ANEMO ID from user's sub or create a new one
      const anemoId = generateAnemoId(user.sub || '');
      
      // Create user profile (in real app, this would come from your backend)
      const userProfile: UserProfile = {
        anemoId,
        email: 'user@example.com', // Would come from JWT token
        name: user.name || 'User',
        picture: user.picture || '/A_logo.png',
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString(),
        totalProcessed: Math.floor(Math.random() * 100) + 10,
        favoriteTools: ['AI Upscaler', 'Depth Map']
      };
      
      setProfile(userProfile);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const generateAnemoId = (userSub: string): string => {
    // Generate a unique ANEMO ID based on user's Google sub
    const hash = btoa(userSub).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    return `ANEMO${hash}`;
  };

  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://anemoia-api.onrender.com';
    
    // Open Google OAuth in popup
    const popup = window.open(
      `${apiBaseUrl}/auth/google`,
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for the auth result
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && !event.origin.includes('anemoias.me')) {
        return;
      }

      if (event.data && event.data.token) {
        // Handle successful authentication
        const { token } = event.data;
        
        // Store token and close popup
        localStorage.setItem('anemoia_token', token);
        popup?.close();
        
        // Reload page to update auth state
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Clean up event listener when popup closes
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <motion.div
                className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <p className="mt-4 text-gray-400">Loading your account...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-950 text-white">
          <Header />
          
          <motion.div 
            className="flex items-center justify-center min-h-[80vh] px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-gray-700/30 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to Anemoia
              </h1>
              
              <p className="text-gray-400 mb-8">
                Sign in with your Google account to access AI-powered image processing tools and manage your projects.
              </p>
              
              <motion.button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white text-gray-800 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </motion.button>
              
              <p className="text-xs text-gray-500 mt-4">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
          
          <Footer />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        
        <motion.div 
          className="max-w-6xl mx-auto px-4 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Account Dashboard
            </h1>
            <p className="text-lg text-gray-400">
              Manage your Anemoia account and AI processing tools
            </p>
          </motion.div>

          {/* Profile Section */}
          <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={profile.picture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-blue-500/20 shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </motion.div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{profile.name}</h2>
                <p className="text-gray-400 mb-4">{profile.email}</p>
                
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-mono font-semibold">ID: {profile.anemoId}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Images Processed</h3>
              </div>
              <p className="text-3xl font-bold text-blue-400">{profile.totalProcessed}</p>
              <p className="text-sm text-gray-400 mt-1">Total AI enhancements</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Member Since</h3>
              </div>
              <p className="text-3xl font-bold text-green-400">{new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              <p className="text-sm text-gray-400 mt-1">Join date</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Last Activity</h3>
              </div>
              <p className="text-3xl font-bold text-purple-400">Today</p>
              <p className="text-sm text-gray-400 mt-1">Recent login</p>
            </motion.div>
          </div>

          {/* AI Tools Grid */}
          <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">AI Tools & Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'AI Upscaler', icon: '⚡', path: '/upscaler', description: 'Enhance image resolution' },
                { name: 'Depth Map', icon: '🗺️', path: '/depth-map', description: 'Generate depth maps' },
                { name: 'Pose Estimation', icon: '🤸', path: '/pose-estimation', description: 'Analyze body poses' },
                { name: 'Image Compare', icon: '🔍', path: '/image-comparison', description: 'Compare images' }
                             ].map((tool) => (
                <motion.a
                  key={tool.name}
                  href={tool.path}
                  className="block p-6 bg-gray-700/20 rounded-xl border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-2xl mb-3">{tool.icon}</div>
                  <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {tool.name}
                  </h4>
                  <p className="text-sm text-gray-400">{tool.description}</p>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Account Actions */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
            <motion.button
              onClick={logout}
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl font-semibold hover:bg-red-600/30 transition-colors duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </motion.button>
            
            <motion.a
              href="/settings"
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3 bg-gray-700/20 text-gray-300 border border-gray-600/30 rounded-xl font-semibold hover:bg-gray-700/30 transition-colors duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Account Settings</span>
            </motion.a>
          </motion.div>
        </motion.div>

        <Footer />
      </div>
    </AnimatedPage>
  );
} 