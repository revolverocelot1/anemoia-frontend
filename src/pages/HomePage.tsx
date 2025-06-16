import Header from '../components/Header';
import Footer from '../components/Footer';
import ToolCard from '../components/ToolCard';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = { // Added : Variants
  hidden: { opacity: 1 }, // Container itself can be initially visible or fade in
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Adjust timing as needed
      delayChildren: 0.2, // Optional delay before children start animating
    },
  },
};

const itemVariants: Variants = { // Added : Variants
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 120, damping: 12 } // Added 'as const'
  },
};

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
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
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
              <ToolCard
                variants={itemVariants}
                title="Image Editor"
                description="Perform quick crops, and color adjustments to perfect your images."
                icon="tune"
                accent="4"
                path="/editor"
              />
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;