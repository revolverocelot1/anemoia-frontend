import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
// We will create these pages next
// import DepthMapPage from './pages/DepthMapPage';
// import PosePage from './pages/PosePage';

function App() {
  return (
    // We don't need a wrapper div here anymore, the layout is handled by pages
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* <Route path="/depth-map" element={<DepthMapPage />} /> */}
      {/* <Route path="/pose-estimation" element={<PosePage />} /> */}
    </Routes>
  );
}

export default App;