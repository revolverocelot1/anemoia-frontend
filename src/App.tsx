import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DepthMapPage from './pages/DepthMapPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import PosePage from './pages/PosePage';
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
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/pose-estimation" element={<PosePage />} />
      {/* <Route path="/pose-estimation" element={<PosePage />} /> */}
    </Routes>
  );
}

export default App;