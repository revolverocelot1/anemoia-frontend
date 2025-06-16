import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './components/AnimatedPage';
import HomePage from './pages/HomePage';
import DepthMapPage from './pages/DepthMapPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PosePage from './pages/PosePage';
import PoseResultsPage from './pages/PoseResultsPage';
import { AccountPage } from './pages/AccountPage';
// We will create these pages next
// import PosePage from './pages/PosePage';

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
        {/* <Route path="/pose-estimation" element={<PosePage />} /> */}
      </Routes>
    </AnimatePresence>
  );
}

export default App;