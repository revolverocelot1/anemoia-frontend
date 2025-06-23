import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './components/AnimatedPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PoseResultsPage from './pages/PoseResultsPage';
import AccountPage from './pages/AccountPage';
import ImageComparisonPage from './pages/ImageComparisonPage';
import ImageComparisonResultsPage from './pages/ImageComparisonResultsPage';
import AIToolsPage from './pages/AIToolsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

function App() {
  const location = useLocation();
  return (
    // We don't need a wrapper div here anymore, the layout is handled by pages
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <AnimatedPage>
              <HomePage />
            </AnimatedPage>
          }
        />
        <Route
          path="/login"
          element={
            <AnimatedPage>
              <LoginPage />
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
          path="/pose-estimation/results"
          element={
            <AnimatedPage>
              <PoseResultsPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/ai-tools"
          element={
            <AnimatedPage>
              <AIToolsPage />
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
      </Routes>
    </AnimatePresence>
  );
}

export default App;