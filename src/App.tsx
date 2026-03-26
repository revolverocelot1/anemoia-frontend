import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AnimatedPage from './components/AnimatedPage';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
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
import TriangleSplattingPage from './pages/TriangleSplattingPage';
// import GaussianSplattingPage from './pages/GaussianSplattingPage';
// We will create these pages next
// import PosePage from './pages/PosePage';
import ImageComparisonPage from './pages/ImageComparisonPage';
import ImageComparisonResultsPage from './pages/ImageComparisonResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import RadiaViewerPage from './pages/RadiaViewerPage';
import TestPage from './pages/TestPage';
import AnimeVideoToCodePage from './pages/AnimeVideoToCodePage';
// TPoseToolPage shelved - incomplete
// import TPoseToolPage from './pages/TPoseToolPage';
import VideoObjectRemoverPage from './pages/VideoObjectRemoverPage';
import SynthIDRemoverPage from './pages/SynthIDRemoverPage';
import SynthIDRemoverLanding from './pages/landing/SynthIDRemoverLanding';
// CoffeeDonation shelved - buymeacoffee link expired
// import CoffeeDonation from './components/CoffeeDonation';
// import FileUploadFix from './components/FileUploadFix';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
import SupabaseLoginPage from './pages/SupabaseLoginPage';
import { detectGPU, logDeploymentInfo } from './utils/gpuUtils';
import { trackPageView } from './services/analytics';
import FaceSwapPage from './pages/FaceSwapPage';
import { AnimatePresence } from 'framer-motion';
import ASCIIVideoConverter from './pages/ASCIIVideoConverter'
import SupportPage from './pages/SupportPage'
import AdminSupportPage from './pages/AdminSupportPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import GeminiImageChatPage from './pages/GeminiImageChatPage'
import PromoAd from './components/PromoAd'

// Lazy load SubtitlePage to prevent ONNX runtime conflicts on app startup
const SubtitlePage = lazy(() => import('./pages/SubtitlePageEnhanced'));
const SubtitleEmbedTestPage = lazy(() => import('./pages/SubtitleEmbedTestPage'));
const SubtitleBenchmarkPage = lazy(() => import('./pages/SubtitleBenchmarkPage'));
const DemoLoginPage = lazy(() => import('./pages/DemoLoginPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));

// Landing Pages
import ImageComparisonLanding from './pages/landing/ImageComparisonLanding';
import DepthMapLanding from './pages/landing/DepthMapLanding';
import UpscalerLanding from './pages/landing/UpscalerLanding';
import PoseEstimationLanding from './pages/landing/PoseEstimationLanding';
import SplatViewerLanding from './pages/landing/SplatViewerLanding';
import TriangleSplattingLanding from './pages/landing/TriangleSplattingLanding';
import OCRCompareLanding from './pages/landing/OCRCompareLanding';
import AnimeGalleryLanding from './pages/landing/AnimeGalleryLanding';
// TPoseLanding shelved - incomplete
// import TPoseLanding from './pages/landing/TPoseLanding';
import ImageChatLanding from './pages/landing/ImageChatLanding';
import ASCIIVideoLanding from './pages/landing/ASCIIVideoLanding';
import SharpLanding from './pages/landing/SharpLanding';

// Lazy load SharpPage to avoid heavy dependencies on startup
const SharpPage = lazy(() => import('./pages/SharpPage'));

// Lazy load R3FCanvas to ensure proper module loading
const R3FCanvas = lazy(() => import('./three/R3FCanvas'));

function App() {
  // ── Analytics: track page views on route changes ──
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Check for authentication tokens in URL on app load
  useEffect(() => {
    const checkAuthTokensInUrl = () => {
      // Check if we have authentication parameters in the URL hash
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log('Auth tokens detected in URL, redirecting to auth callback');
        // Redirect to auth callback page to handle the tokens
        window.location.href = '/auth/callback' + hash;
      }
    };

    checkAuthTokensInUrl();
  }, []);

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
    <ErrorBoundary>
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
            <ErrorBoundary fallback={null}>
            <R3FCanvas />
            </ErrorBoundary>
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
      
      {/* Temporarily disabled FileUploadFix to test video editor */}
      {/* <FileUploadFix /> */}
      
      {/* App-level Sidebar for Secret Tools escapes route-level transforms */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <SupabaseAuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <HomePage onToggleSidebar={toggleSidebar} />
                </AnimatedPage>
              }
            />
            
            {/* Landing Pages for SEO */}
            <Route
              path="/compare/landing"
              element={
                <AnimatedPage>
                  <ImageComparisonLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/depth-map/landing"
              element={
                <AnimatedPage>
                  <DepthMapLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/upscaler/landing"
              element={
                <AnimatedPage>
                  <UpscalerLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/pose-estimation/landing"
              element={
                <AnimatedPage>
                  <PoseEstimationLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/splat-viewer/landing"
              element={
                <AnimatedPage>
                  <SplatViewerLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/triangle-splatting/landing"
              element={
                <AnimatedPage>
                  <TriangleSplattingLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/ocr/landing"
              element={
                <AnimatedPage>
                  <OCRCompareLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/anime-gallery/landing"
              element={
                <AnimatedPage>
                  <AnimeGalleryLanding />
                </AnimatedPage>
              }
            />
            {/* T-Pose shelved */}
            <Route path="/t-poser/landing" element={<Navigate to="/" replace />} />
            <Route
              path="/image-chat/landing"
              element={
                <AnimatedPage>
                  <ImageChatLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/ascii-video-converter/landing"
              element={
                <AnimatedPage>
                  <ASCIIVideoLanding />
                </AnimatedPage>
              }
            />
            <Route
              path="/sharp/landing"
              element={
                <AnimatedPage>
                  <SharpLanding />
                </AnimatedPage>
              }
            />

            {/* Redirects for SEO */}
            <Route path="/ocr" element={<Navigate to="/compare" replace />} />
            <Route path="/triangle-splat" element={<Navigate to="/triangle-splatting" replace />} />
            
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
              path="/auth/callback/google"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <OAuthCallbackPage />
                  </Suspense>
                </AnimatedPage>
              }
            />
            <Route
              path="/auth/callback/twitter"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <OAuthCallbackPage />
                  </Suspense>
                </AnimatedPage>
              }
            />
            <Route
              path="/auth/callback/github"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <OAuthCallbackPage />
                  </Suspense>
                </AnimatedPage>
              }
            />
            <Route
              path="/auth/success"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <OAuthCallbackPage />
                  </Suspense>
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
              path="/support"
              element={
                <AnimatedPage>
                  <SupportPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/admin/support"
              element={
                <AnimatedPage>
                  <AdminSupportPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AnimatedPage>
                  <AdminDashboardPage />
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
              path="/splat-viewer"
              element={
                <AnimatedPage>
                  <RadiaViewerPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/sharp"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <SharpPage />
                  </Suspense>
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
              path="/face-swap"
              element={
                <AnimatedPage>
                  <FaceSwapPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/subtitle"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <Suspense fallback={<LoadingFallback />}>
                      <SubtitlePage />
                    </Suspense>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subtitle-embed-test"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <SubtitleEmbedTestPage />
                  </Suspense>
                </AnimatedPage>
              }
            />
            <Route
              path="/subtitle-benchmark"
              element={
                <AnimatedPage>
                  <Suspense fallback={<LoadingFallback />}>
                    <SubtitleBenchmarkPage />
                  </Suspense>
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
            <Route path="/ascii-video-converter" element={<ASCIIVideoConverter />} />
            <Route
              path="/triangle-splatting"
              element={
                <AnimatedPage>
                  <TriangleSplattingPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/anime-video-to-code"
              element={
                <AnimatedPage>
                  <AnimeVideoToCodePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/image-chat"
              element={
                <AnimatedPage>
                  <GeminiImageChatPage />
                </AnimatedPage>
              }
            />
            {/* T-Pose shelved */}
            <Route path="/t-poser" element={<Navigate to="/" replace />} />
            <Route
              path="/video-object-remover"
              element={
                <AnimatedPage>
                  <VideoObjectRemoverPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/synthid-remover"
              element={
                <AnimatedPage>
                  <SynthIDRemoverPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/synthid-remover/landing"
              element={
                <AnimatedPage>
                  <SynthIDRemoverLanding />
                </AnimatedPage>
              }
            />
            <Route path="/misc" element={<Navigate to="/" />} />
            {/* Catch-all route for non-existent pages */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SupabaseAuthProvider>
        <div className="absolute bottom-0 left-0 w-full pointer-events-none z-[40]">
          {/* Ad Container literally attached to the App's bottom DOM flow */}
          <div className="absolute bottom-6 left-6 flex flex-col items-start">
            <div className="pointer-events-auto flex flex-col">
              {/* ML-SHARP Global Ad - blocked on specific routes */}
              <PromoAd 
                id="ml-sharp"
                videoSrc="/videos/sharp-demo-1.mp4"
                targetUrl="/sharp/landing"
                tagline="Try Apple ML-SHARP"
                title="Turn any image into a 3D Gaussian Splat"
                subtitle="100% private. Browser-based. Generate in seconds."
                ctaText="Generate 3D Now"
                blocklist={[
                  '/', 
                  '/splat-viewer/landing', 
                  '/sharp/landing', 
                  '/splat-viewer', 
                  '/radia-viewer', 
                  '/sharp',
                  '/account',
                  '/admin/dashboard',
                  '/admin/support',
                  '/support'
                ]}
              />

              {/* ASCII Video Converter Ad - ONLY on the /sharp tool page */}
              <PromoAd 
                id="ascii-converter"
                videoSrc="/videos/ascii-demo-video.mp4"
                targetUrl="/ascii-video-converter/landing"
                tagline="New Tool"
                title="Convert any video to ASCII Art"
                subtitle="Real-time browser rendering. 100% private."
                ctaText="Try ASCII Converter"
                allowlist={['/sharp']}
              />
            </div>
          </div>
        </div>

        {/* CoffeeDonation shelved - buymeacoffee link expired */}
      </div>
    </ErrorBoundary>
  );
}

export default App;