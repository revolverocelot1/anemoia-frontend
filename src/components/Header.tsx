import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const { user, signOut, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-[#1a1a1a] px-6 md:px-10 lg:px-20 xl:px-40 py-4 backdrop-blur-md bg-black/50 relative z-20">
      <div className="flex items-center gap-4 text-white">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <img src="/A_logo.png" alt="Anemoia" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight leading-none bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-400 transition-all duration-300">
            Anemoia
          </h2>
        </Link>
      </div>
      
      <nav className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
        <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Home
        </Link>
        <Link to="/faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          FAQ
        </Link>
        <Link to="/settings" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Settings
        </Link>
        <Link to="/support" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Support
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-4">
            <Link
              to="/account"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]}
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all"
          >
            Sign In
          </Link>
        )}
        
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gray-300 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-b border-[#1a1a1a] md:hidden"
          >
            <nav className="flex flex-col p-4 gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/faq"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                to="/settings"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
              <Link
                to="/support"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>
              {isAuthenticated && (
                <Link
                  to="/account"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Account
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header; 