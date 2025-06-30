import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DepthMapPage from './pages/DepthMapPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PosePage from './pages/PosePage';
import PoseResultsPage from './pages/PoseResultsPage';
import UpscalerPage from './pages/UpscalerPage';
import UpscalerResultsPage from './pages/UpscalerResultsPage';
import ObjectRemovalPage from './pages/ObjectRemovalPage';
import { AccountPage } from './pages/AccountPage';
// We will create these pages next
// import PosePage from './pages/PosePage';

function App() {
  return (
    // We don't need a wrapper div here anymore, the layout is handled by pages
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/depth-map" element={<DepthMapPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/pose-estimation" element={<PosePage />} />
      <Route path="/pose-estimation/results" element={<PoseResultsPage />} />
      <Route path="/upscaler" element={<UpscalerPage />} />
      <Route path="/upscaler/results" element={<UpscalerResultsPage />} />
      <Route path="/object-removal" element={<ObjectRemovalPage />} />
      {/* <Route path="/pose-estimation" element={<PosePage />} /> */}
    </Routes>
  );
}

export default App;