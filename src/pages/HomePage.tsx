import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const handleLogin = () => {
    // This will redirect to your backend's login route
    // Make sure VITE_API_BASE_URL is set in Render
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`;
  };

  return (
    <div className="homepage-container">
      <header className="app-header">
        <h1 className="app-title">Anemoia</h1>
        <nav className="header-nav">
          {/* <a href="/faq">FAQ</a> */}
          <button onClick={handleLogin} className="login-button">Login with Google</button>
        </nav>
      </header>
      
      <main className="card-grid">
        <div className="tool-card" onClick={() => handleCardClick('/depth-map')}>
          <h2 className="card-title">Depth Map</h2>
          <p className="card-description">Generate stunning 3D depth maps from any 2D image.</p>
        </div>

        <div className="tool-card" onClick={() => handleCardClick('/pose-estimation')}>
          <h2 className="card-title">Pose Estimation</h2>
          <p className="card-description">Detect and visualize human body poses in your photos.</p>
        </div>

        <div className="tool-card" onClick={() => handleCardClick('/upscale')}>
          <h2 className="card-title">AI Upscaler</h2>
          <p className="card-description">Upscale images up to 4x their size with incredible detail.</p>
        </div>

        <div className="tool-card" onClick={() => handleCardClick('/edit')}>
          <h2 className="card-title">Image Editor</h2>
          <p className="card-description">Perform quick crops and color adjustments to perfect images.</p>
        </div>
      </main>
    </div>
  );
}

export default HomePage;