import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
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
// import TriangleSplattingPage from './pages/TriangleSplattingPage';
// import GaussianSplattingPage from './pages/GaussianSplattingPage';
// We will create these pages next
// import PosePage from './pages/PosePage';
import ImageComparisonPage from './pages/ImageComparisonPage';
import ImageComparisonResultsPage from './pages/ImageComparisonResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import SplatViewerPage from './pages/SplatViewerPage';
import R3FCanvas from './three/R3FCanvas';
import TestPage from './pages/TestPage';
import CoffeeDonation from './components/CoffeeDonation';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
import SupabaseLoginPage from './pages/SupabaseLoginPage';

function App() {
  return (
    <>
      <R3FCanvas />
      <BrowserRouter>
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
      </BrowserRouter>
      <CoffeeDonation />
    </>
  );
}

export default App;