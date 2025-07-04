import Header from '../components/Header';
import Footer from '../components/Footer';

const TestPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full border border-cyan-500/20">
          <h1 className="text-3xl font-bold mb-4 text-cyan-400">3D Background Test</h1>
          
          <div className="space-y-4 text-gray-300">
            <p>This page tests if the 3D background is rendering properly.</p>
            
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-2 text-white">Expected:</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Animated wireframe cube in the center</li>
                <li>8 colored spheres orbiting around</li>
                <li>Blue grid on the floor</li>
                <li>Cyan and magenta point lights</li>
              </ul>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-2 text-white">Debug Info:</h2>
              <p>Canvas element should be at z-index: 0</p>
              <p>Main content at z-index: 1</p>
              <p>Background should be transparent</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TestPage; 