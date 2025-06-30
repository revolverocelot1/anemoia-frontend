import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';

const HomePage = () => {
  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center max-w-5xl flex-1 w-full">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">AI Photo Editing Suite</h2>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                Unlock the power of AI to transform your images. Explore our tools and create something amazing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              <ToolCard
                title="Depth Map"
                description="Generate stunning 3D depth maps from any 2D image."
                icon="layers"
                accent="1"
                path="/depth-map"
              />
              <ToolCard
                title="Pose Estimation"
                description="Detect and visualize human body poses in your photos."
                icon="accessibility_new"
                accent="2"
                path="/pose-estimation"
              />
              <ToolCard
                title="AI Upscaler"
                description="Enhance image resolution using Real-ESRGAN AI technology"
                icon="auto_awesome"
                accent="3"
                path="/upscaler"
              />
              <ToolCard
                title="Object Removal"
                description="Remove unwanted objects from images with professional AI technology"
                icon="auto_fix_high"
                accent="4"
                path="/object-removal"
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;