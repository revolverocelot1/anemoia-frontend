import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SettingsPage = () => {
  const { isAuthenticated, user } = useSupabaseAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-gray-100">You are not signed in.</h2>
        <p className="text-gray-400">Please sign in to access settings.</p>
        <motion.button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Sign In
        </motion.button>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-[60vh] p-10">
      <motion.div 
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 w-full max-w-lg space-y-6 border border-cyan-500/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-white">User Settings</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Account Email:</p>
            <p className="text-lg font-mono text-cyan-400 break-all bg-gray-900/50 rounded px-3 py-2 border border-gray-700">
              {user?.email || 'N/A'}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Display Name:</p>
            <p className="text-lg font-mono text-cyan-400 break-all bg-gray-900/50 rounded px-3 py-2 border border-gray-700">
              {user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'N/A'}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-400">ANEMO User ID:</p>
            <p className="text-lg font-mono text-cyan-400 break-all bg-gray-900/50 rounded px-3 py-2 border border-gray-700">
              ANEMO-{user?.email?.slice(0, 4).toUpperCase() || 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-500">
            All AI processing happens locally in your browser. Your images are never uploaded to our servers.
          </p>
        </div>
      </motion.div>
    </main>
  );
};

export default SettingsPage; 