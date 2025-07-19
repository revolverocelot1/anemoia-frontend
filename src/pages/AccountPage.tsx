import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';
import { useNavigate } from 'react-router-dom';

export default function AccountPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut, isLoading: authLoading } = useSupabaseAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

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

  if (authLoading) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <motion.div
                className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 mx-auto"
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

  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  const accountCreatedDate = new Date();
  accountCreatedDate.setMonth(accountCreatedDate.getMonth() - 1); // Demo: Show account created 1 month ago

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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Account Dashboard
            </h1>
            <p className="text-lg text-gray-400">
              Manage your Anemoia account and AI processing tools
            </p>
          </motion.div>

          {/* Profile Section */}
          <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/20 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 p-1">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-3xl font-bold">
                    {user.user_metadata?.name?.charAt(0).toUpperCase() || user.user_metadata?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </motion.div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</h2>
                <p className="text-gray-400 mb-4">{user.email || 'No email'}</p>
                
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-mono font-semibold">ANEMO-{user.email?.slice(0, 4).toUpperCase() || 'USER'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Account Type</h3>
              </div>
              <p className="text-3xl font-bold text-cyan-400">Free</p>
              <p className="text-sm text-gray-400 mt-1">Unlimited AI processing</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Member Since</h3>
              </div>
              <p className="text-3xl font-bold text-green-400">
                {accountCreatedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-400 mt-1">Join date</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Tools Available</h3>
              </div>
              <p className="text-3xl font-bold text-purple-400">6</p>
              <p className="text-sm text-gray-400 mt-1">AI-powered tools</p>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/20 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                onClick={() => navigate('/')}
                className="flex items-center space-x-3 px-6 py-4 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-xl font-semibold hover:bg-cyan-600/30 transition-colors duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Back to Tools</span>
              </motion.button>

              <motion.button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-3 px-6 py-4 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-xl font-semibold hover:bg-purple-600/30 transition-colors duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Account Actions */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
            <motion.button
              onClick={signOut}
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl font-semibold hover:bg-red-600/30 transition-colors duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </motion.button>
          </motion.div>
        </motion.div>

        <Footer />
      </div>
    </AnimatedPage>
  );
} 