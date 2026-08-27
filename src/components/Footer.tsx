import { APP_COMMIT, APP_BRANCH, APP_BUILD_TIME, GITHUB_REPO } from '../constants/version';

const Footer = () => {
  const buildDate = (() => {
    try {
      const d = new Date(APP_BUILD_TIME);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return APP_BUILD_TIME;
    }
  })();

  const commitUrl = APP_COMMIT !== 'dev' && APP_COMMIT !== 'unknown'
    ? `${GITHUB_REPO}/commit/${APP_COMMIT}`
    : null;

  return (
    <footer className="w-full border-t border-gray-700/30 mt-auto bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Left side - Logo and copyright */}
          <div className="flex items-center space-x-2">
            <img src="/A_logo.png" alt="Anemoia" className="w-6 h-6" />
            <span className="text-sm text-gray-400">© 2025 Anemoia. All rights reserved.</span>
          </div>
          
          {/* Right side - Links */}
          <div className="flex items-center space-x-6">
            <a 
              href="/privacy" 
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <a 
              href="/terms" 
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              Terms of Service
            </a>
            <a 
              href="/faq" 
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              FAQ
            </a>
            <a 
              href="/support" 
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              Support
            </a>
          </div>
        </div>
        
        {/* Bottom text */}
        <div className="text-center mt-6 pt-6 border-t border-gray-700/30">
          <p className="text-xs text-gray-500">
            Professional AI-powered image processing tools. Enhance your images with cutting-edge technology.
          </p>
          {/* Version badge */}
          <p className="text-[10px] text-gray-600 mt-2 font-mono tracking-wide">
            {commitUrl ? (
              <a
                href={commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-400 transition-colors duration-200"
              >
                {APP_COMMIT}
              </a>
            ) : (
              <span>{APP_COMMIT}</span>
            )}
            <span className="mx-1">·</span>
            <span>{APP_BRANCH}</span>
            <span className="mx-1">·</span>
            <span>Built {buildDate}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
 