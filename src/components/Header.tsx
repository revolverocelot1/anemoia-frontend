import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { openAuthPopup } from '../utils/authPopup';

const Header = () => {
  const { setToken, isAuthenticated, logout, user } = useAuth();

  const handleLogin = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    console.log('Auth URL:', `${apiBaseUrl}/auth/google`);
    try {
      const authResult = await openAuthPopup(`${apiBaseUrl}/auth/google`);
      setToken(authResult.token);
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const clearTokens = () => {
    localStorage.removeItem('anemoia_token');
    logout();
    window.location.reload();
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-xl border-b border-gray-800"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <NavLink to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img 
                src="/A_logo.png" 
                alt="Anemoia" 
                className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors duration-300">
                Anemoia
              </h1>
              <span className="text-xs text-gray-400 -mt-1 hidden sm:block">AI Image Tools</span>
            </div>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `text-sm font-medium transition-colors duration-300 hover:text-blue-400 ${
                  isActive ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-300'
                }`
              }
            >
              Tools
            </NavLink>
            <NavLink 
              to="/ai-tools" 
              className={({ isActive }) => 
                `text-sm font-medium transition-colors duration-300 hover:text-blue-400 ${
                  isActive ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-300'
                }`
              }
            >
              AI Editor
            </NavLink>
            <NavLink 
              to="/compare" 
              className={({ isActive }) => 
                `text-sm font-medium transition-colors duration-300 hover:text-blue-400 ${
                  isActive ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-300'
                }`
              }
            >
              Compare
            </NavLink>
            <NavLink 
              to="/faq" 
              className={({ isActive }) => 
                `text-sm font-medium transition-colors duration-300 hover:text-blue-400 ${
                  isActive ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-300'
                }`
              }
            >
              FAQ
            </NavLink>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
          {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* Debug: Clear tokens button - only in development */}
                {import.meta.env.DEV && (
              <button
                onClick={clearTokens}
                    className="text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
                title="Clear all tokens and reload"
              >
                Clear Cache
              </button>
                )}
                
                {/* User Info */}
                <div className="flex items-center space-x-3">
              {user?.picture && (
                    <img 
                      src={user.picture} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full ring-2 ring-gray-600 hover:ring-blue-400 transition-all duration-300" 
                    />
              )}
                  <span className="text-sm font-medium text-white truncate max-w-[120px] hidden sm:block">
                {user?.name || 'User'}
              </span>
                </div>

                {/* Logout Button */}
                <motion.button
                onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={handleLogin}
                className="group flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
                <svg className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign In</span>
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex flex-col space-y-2">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 ${
                  isActive ? 'text-blue-400 bg-blue-400/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              Tools
            </NavLink>
            <NavLink 
              to="/ai-tools" 
              className={({ isActive }) => 
                `text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 ${
                  isActive ? 'text-blue-400 bg-blue-400/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              AI Editor
            </NavLink>
            <NavLink 
              to="/compare" 
              className={({ isActive }) => 
                `text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 ${
                  isActive ? 'text-blue-400 bg-blue-400/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              Compare
            </NavLink>
            <NavLink 
              to="/faq" 
              className={({ isActive }) => 
                `text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 ${
                  isActive ? 'text-blue-400 bg-blue-400/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              FAQ
            </NavLink>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header; 