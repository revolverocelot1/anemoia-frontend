import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import { motion, type Variants, type Transition } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemTransition: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 12
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: itemTransition
  },
};

const HomePage = () => {
  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 overflow-y-auto">
          <div className="layout-content-container flex flex-col items-center max-w-7xl flex-1 w-full">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tighter">
                AI Photo Studio — powered by WebGPU
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                All models run <strong>directly in your browser</strong> using WebGPU/WebGL — no images ever leave your device. That means instant processing, full privacy and zero server-side costs.
              </p>
            </div>
            
            {/* Tools Grid - Max 3 per row for better spacing */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 w-full max-w-6xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Row 1 */}
              <ToolCard
                variants={itemVariants}
                title="Depth Map"
                description="Generate stunning 3D depth maps from any 2D image."
                icon="layers"
                accent="1"
                path="/depth-map"
              />
              <ToolCard
                variants={itemVariants}
                title="Pose Estimation"
                description="Detect and visualize human body poses in your photos."
                icon="accessibility_new"
                accent="2"
                path="/pose-estimation"
              />
              <ToolCard
                variants={itemVariants}
                title="AI Upscaler"
                description="Upscale your images up to 4x their size with incredible detail."
                icon="zoom_in"
                accent="3"
                path="/upscaler"
              />
              
              {/* Row 2 */}
              <ToolCard
                variants={itemVariants}
                title="Image Comparison"
                description="Compare two images and spot the differences with AI-powered analysis."
                icon="compare_arrows"
                accent="4"
                path="/compare"
              />
              
              {/* AI Inpainting with Construction Notice */}
              <motion.div
                variants={itemVariants}
                className="relative"
              >
                <ToolCard
                  title="AI Inpainting"
                  description="Remove unwanted objects or fill missing areas using AOT-GAN."
                  icon="auto_fix_high"
                  accent="1"
                  path="/inpainting"
                />
                
                {/* Construction Banner */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2 z-10"
                >
                  <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white dark:border-gray-800 flex items-center space-x-2 text-sm font-bold">
                    <span className="material-symbols-outlined text-lg animate-bounce">construction</span>
                    <span>Beta</span>
                  </div>
                </motion.div>
              </motion.div>
              
              {/* Placeholder for future tools - can be removed or replaced */}
              <motion.div
                variants={itemVariants}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[200px] bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl text-white">add</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-600 dark:text-gray-300">More Tools Coming</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  We're working on bringing you more AI-powered photo editing tools
                </p>
              </motion.div>
            </motion.div>
            
            {/* Feature Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-16 w-full max-w-4xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-white text-xl">security</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">100% Private</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    All processing happens in your browser. Your images never leave your device.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-white text-xl">speed</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">GPU Accelerated</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Powered by WebGPU and WebGL for lightning-fast processing on your graphics card.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-white text-xl">cloud_off</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Works Offline</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    No internet required after initial load. Perfect for sensitive projects.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;