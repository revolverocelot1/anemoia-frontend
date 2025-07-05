import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';
import { useNavigate } from 'react-router-dom';

interface TestEmail {
  id: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  timestamp: number;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoading: authLoading, token } = useAuth();
  const [testEmails, setTestEmails] = useState<TestEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchTestEmails = async () => {
    if (!user?.email) return;
    
    setLoadingEmails(true);
    try {
      const emails = await authService.getTestEmails(user.email);
      setTestEmails(emails);
      setShowEmails(true);
    } catch (error) {
      console.error('Failed to fetch test emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token || !deletePassword) return;
    
    setDeleteLoading(true);
    try {
      await authService.deleteAccount(token, deletePassword);
      logout();
      navigate('/');
    } catch (error: any) {
      alert(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
      }
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
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
            </div>
              </motion.div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                <p className="text-gray-400 mb-4">{user.email}</p>
                
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-mono font-semibold">{user.anemo_id || `ANEMO-${user.id.slice(0, 4).toUpperCase()}`}</span>
          </div>

                  <div className="flex items-center space-x-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{user.emailVerified ? 'Verified' : 'Unverified'}</span>
                  </div>

                  {user.provider && (
                    <div className="flex items-center space-x-2 text-purple-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="capitalize">{user.provider} Account</span>
                    </div>
                  )}
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
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-400 mt-1">Join date</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Test Emails</h3>
              </div>
              <p className="text-3xl font-bold text-purple-400">{user.email.split('@')[0]}@mc639.testmail.app</p>
              <button
                onClick={fetchTestEmails}
                disabled={loadingEmails}
                className="text-sm text-purple-400 hover:text-purple-300 mt-1 underline"
              >
                {loadingEmails ? 'Loading...' : 'Check emails'}
              </button>
            </motion.div>
          </div>

          {/* Test Emails Section */}
          {showEmails && (
            <motion.div variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/20 mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">Test Emails</h3>
              {testEmails.length === 0 ? (
                <p className="text-gray-400">No test emails found</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {testEmails.map((email) => (
                    <div key={email.id} className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{email.subject}</h4>
                        <span className="text-xs text-gray-400">
                          {new Date(email.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">From: {email.from}</p>
                      <div className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: email.html || email.text }} />
                    </div>
              ))}
        </div>
              )}
          </motion.div>
          )}

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
            
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3 bg-gray-700/20 text-gray-300 border border-gray-600/30 rounded-xl font-semibold hover:bg-gray-700/30 transition-colors duration-300"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Account</span>
            </motion.button>
          </motion.div>

          {/* Delete Account Confirmation */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-red-500/20"
              >
                <h3 className="text-xl font-bold text-white mb-4">Delete Account</h3>
                <p className="text-gray-400 mb-4">
                  This action cannot be undone. Please enter your password to confirm.
                </p>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={!deletePassword || deleteLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        <Footer />
      </div>
    </AnimatedPage>
  );
} 