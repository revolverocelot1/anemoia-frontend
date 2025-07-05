import { Routes, Route, Navigate } from 'react-router-dom';
import AnimatedPage from './components/AnimatedPage';
import HomePage from './pages/HomePage';
import DepthMapPage from './pages/DepthMapPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PosePage from './pages/PosePage';
import PoseResultsPage from './pages/PoseResultsPage';
import AccountPage from './pages/AccountPage';
import NewUpscalerPage from './pages/NewUpscalerPage';
import DoomPage from './pages/DoomPage';
import AnimeGalleryPage from './pages/AnimeGalleryPage';
import AGHPBArchivePage from './pages/AGHPBArchivePage';
// import TriangleSplattingPage from './pages/TriangleSplattingPage';
// import GaussianSplattingPage from './pages/GaussianSplattingPage';
// We will create these pages next
// import PosePage from './pages/PosePage';
import ImageComparisonPage from './pages/ImageComparisonPage';
import ImageComparisonResultsPage from './pages/ImageComparisonResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import SplatViewerPage from './pages/SplatViewerPage';
import TestPage from './pages/TestPage';
import CoffeeDonation from './components/CoffeeDonation';
import FileUploadFix from './components/FileUploadFix';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
import SupabaseLoginPage from './pages/SupabaseLoginPage';
import { useState, useEffect, Suspense, lazy } from 'react';
import { detectGPU, logDeploymentInfo } from './utils/gpuUtils';

// Lazy load R3FCanvas to ensure proper module loading
const R3FCanvas = lazy(() => import('./three/R3FCanvas'));

function App() {
  // Check localStorage for 3D background preference
  const [show3DBackground, setShow3DBackground] = useState(() => {
    const saved = localStorage.getItem('show3DBackground');
    // Default to false in production for better performance
    const isProduction = window.location.hostname !== 'localhost';
    const defaultValue = saved !== null ? saved === 'true' : !isProduction;
    console.log('Initial 3D background state:', {
      saved,
      isProduction,
      defaultValue,
      hostname: window.location.hostname
    });
    return defaultValue;
  });
  const [backgroundError, setBackgroundError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [modulesReady, setModulesReady] = useState(false);

  useEffect(() => {
    // Log deployment info and GPU capabilities
    logDeploymentInfo();
    
    detectGPU().then(gpuInfo => {
      console.log('GPU Detection Complete:', gpuInfo);
      
      // Warn if low-end device detected
      if (gpuInfo.tier === 0 || !gpuInfo.webGLSupported) {
        console.warn('Low-end device or no WebGL support detected. 3D background may not work properly.');
      }
    }).catch(err => {
      console.error('GPU detection failed:', err);
    });
    
    // Set default background type to solar system if not set
    if (!localStorage.getItem('3DBackgroundType')) {
      localStorage.setItem('3DBackgroundType', 'solar');
      console.log('Set default background type to solar system');
    }
    
    // Log environment and Three.js loading status
    console.log('App environment:', {
      hostname: window.location.hostname,
      isProduction: window.location.hostname !== 'localhost',
      show3DBackground,
      backgroundType: localStorage.getItem('3DBackgroundType'),
      threeLoaded: typeof (window as any).THREE !== 'undefined',
      r3fAvailable: !!(window as any).__R3F__,
      webGLSupported: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch(e) {
          return false;
        }
      })()
    });

    // Check if modules are loaded
    const checkModules = () => {
      const isReady = !!(window as any).THREE && !!(window as any).__R3F__;
      if (isReady && !modulesReady) {
        console.log('Three.js modules are ready!');
        setModulesReady(true);
      }
      return isReady;
    };

    // Initial check
    checkModules();

    // Try to load Three.js explicitly
    const checkThreeJS = setInterval(() => {
      if (checkModules()) {
        clearInterval(checkThreeJS);
      }
    }, 100);

    // Cleanup
    setTimeout(() => clearInterval(checkThreeJS), 5000); // Stop checking after 5 seconds

    // Add keyboard shortcut to toggle 3D background (Ctrl/Cmd + B)
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Cmd:', e.metaKey);
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        e.stopPropagation();
        
        setShow3DBackground(prev => {
          const newValue = !prev;
          localStorage.setItem('show3DBackground', String(newValue));
          console.log('3D Background toggled from', prev, 'to', newValue);
          setBackgroundError(false); // Reset error state
          
          // Show toast notification
          setToastMessage(newValue ? '3D Background Enabled' : '3D Background Disabled');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          
          // Force a re-render by updating state
          setTimeout(() => {
            console.log('3D Background is now:', newValue);
          }, 100);
          
          return newValue;
        });
      }
    };

    // Catch any 3D rendering errors
    const handleError = (e: ErrorEvent) => {
      if (e.message && (e.message.includes('WebGL') || e.message.includes('THREE'))) {
        console.error('3D Background error:', e);
        setBackgroundError(true);
        setShow3DBackground(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <>
      {/* 3D Background with error handling and blur effect */}
      {show3DBackground && !backgroundError && modulesReady && (
        <div 
          className="fixed inset-0 w-full h-full" 
          style={{ 
            zIndex: 0,
            filter: 'blur(1px)',
            opacity: 0.8,
            pointerEvents: 'none'
          }}
        >
          <Suspense fallback={
            <div className="fixed inset-0 bg-black flex items-center justify-center">
              <div className="text-white">Loading 3D Background...</div>
            </div>
          }>
            <R3FCanvas />
          </Suspense>
        </div>
      )}
      
      {/* Fallback background */}
      {(!show3DBackground || !modulesReady || backgroundError) && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800" 
          style={{ zIndex: 0 }} 
        />
      )}
      
      {/* Toast Notification with background type info */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <span className="material-symbols-outlined">
              {toastMessage.includes('Enabled') ? 'visibility' : 'visibility_off'}
            </span>
            <span>{toastMessage}</span>
            {show3DBackground && (
              <span className="text-xs text-gray-400 ml-2">
                ({localStorage.getItem('3DBackgroundType') || 'solar'})
              </span>
            )}
          </div>
        </div>
      )}
      
      <FileUploadFix />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <SupabaseAuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <HomePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/depth-map"
              element={
                <AnimatedPage>
                  <DepthMapPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/login"
              element={
                <AnimatedPage>
                  <SupabaseLoginPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/auth/callback"
              element={
                <AnimatedPage>
                  <AuthCallbackPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/account"
              element={
                <AnimatedPage>
                  <AccountPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/settings"
              element={
                <AnimatedPage>
                  <SettingsPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/faq"
              element={
                <AnimatedPage>
                  <FAQPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/pose-estimation"
              element={
                <AnimatedPage>
                  <PosePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/pose-estimation/results"
              element={
                <AnimatedPage>
                  <PoseResultsPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/upscaler"
              element={
                <AnimatedPage>
                  <NewUpscalerPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/doom"
              element={
                <AnimatedPage>
                  <DoomPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/anime-gallery"
              element={
                <AnimatedPage>
                  <AnimeGalleryPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/aghpb-archive"
              element={
                <AnimatedPage>
                  <AGHPBArchivePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/splat-viewer"
              element={
                <AnimatedPage>
                  <SplatViewerPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/compare"
              element={
                <AnimatedPage>
                  <ImageComparisonPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/compare/results"
              element={
                <AnimatedPage>
                  <ImageComparisonResultsPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/privacy"
              element={
                <AnimatedPage>
                  <PrivacyPolicyPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/terms"
              element={
                <AnimatedPage>
                  <TermsOfServicePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/test"
              element={
                <AnimatedPage>
                  <TestPage />
                </AnimatedPage>
              }
            />
            <Route path="/misc" element={<Navigate to="/" />} />
          </Routes>
        </SupabaseAuthProvider>
        <CoffeeDonation />
      </div>
    </>
  );
}

export default App;