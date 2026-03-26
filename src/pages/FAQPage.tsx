import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

interface FAQItem {
  q: string;
  a: string;
  category?: string;
}

const faqData: { [key: string]: FAQItem[] } = {
  'The Studio': [
    {
      q: 'What actually is Anemoia?',
      a: "It's a sandbox for pushing the limits of what browsers can do. We run heavy 3D rendering, machine learning, and computer vision algorithms right in your browser using WebGL and WebAssembly. No huge software installs, no massive cloud fees. Just drop a file in and let your GPU carry the weight."
    },
    {
      q: 'Do I need a crazy expensive GPU to run this?',
      a: "A dedicated GPU helps immensely, but it's not strictly required. If you're on a cloud VM or a lightweight laptop, Chrome will fall back to software rendering (like SwiftShader). Things will initially take longer to process, and you might even see a black canvas until you interact with it, but the math still checks out and it will work."
    },
    {
      q: 'Is it completely free?',
      a: "Yeah, basically. The core client-side tools only cost your own electricity. We run dedicated backend endpoints for auth and some of the heavy-lifting Gemini stuff, so if you want to bypass limits or save your workspace, signing in is the way to go."
    }
  ],
  'Neural Processing': [
    {
      q: 'How does the image upscaler actually work?',
      a: 'We chunk your image into 64x64 tiles and run them through local neural network weights (like Real-ESRGAN or CUGAN) right here in the browser. It hallucinates missing details instead of just blindly stretching pixels. The first time you run it, it pulls down a hefty model file (ranging from 2MB to 35MB), but after that, it lives natively in your browser cache.'
    },
    {
      q: 'What is the SHARP 3D Generator doing to my images?',
      a: 'It uses monocular depth mapping to hallucinate 3D structure from a flat 2D image. Under the hood, a Web Worker blasts the image through a neural depth network and generates roughly 590,000 Gaussian splats in about 10 seconds. You go from a single JPEG directly to a fully orbital 3D point cloud.'
    },
    {
      q: 'Face Swap is feeling magical. How are you doing that?',
      a: "We're using a cocktail of specialized ONNX models executing via WebGL. The less you know about the exact blend, the better. Just know that it maps facial landmarks, warps the geometry, and handles the color matching locally. We keep the real secret sauce closely guarded."
    }
  ],
  'Spatial Computing': [
    {
      q: 'What formats can the 3D Splat Viewer handle?',
      a: "We natively render .splat files and standard .ply point clouds using custom high-performance WebGL shaders. We handle the heavy matrix math, frustum culling, and alpha sorting so you can orbit millions of splats seamlessly at 60fps."
    },
    {
      q: 'What is "Triangle Splatting"?',
      a: "Triangle Splatting is a brand new, highly experimental technique that swaps traditional splat discs for actual geometric meshes to drastically increase sharpness. But here's the disclaimer: This is bleeding-edge tech. There is barely any ecosystem support for it, and it's mostly in here for researchers, academics, and graphics nerds who want to break things."
    }
  ],
  'Classified Operations': [
    {
      q: 'I found the Secret Tools tab. What is that?',
      a: "We use this place for our weirdest experiments and retro hyper-fixations. Need to play DOOM in a WebAssembly sandbox mid-workflow? Want to look at a nostalgic 1990s terminal filled with anime girls holding programming books? That's what it's for. Don't ask too many questions."
    },
    {
      q: 'Why are half the tools marked "Under Construction"?',
      a: "Because we ship things broken and fix them live. We're actively building out tools for video object removal, batch conversion, and watermark neutralization. They'll unlock when they're actually stable (or at least stable enough)."
    }
  ],
  'Telemetry & Privacy': [
    {
      q: 'Why does the browser freeze or take forever the very first time I run a tool?',
      a: "Because executing machine learning in the browser is hard. The first time you click 'Run', we download the neural network weights from our CDN. Sometimes the WebGL shader compilation locks up the main thread for a second. We cache everything in IndexedDB immediately, so the second time around, it skips the download and runs instantly."
    },
    {
      q: 'Are my files being uploaded to your servers?',
      a: "The vast majority of the processing (upscaling, depth mapping, splat generation) happens directly on your own GPU. Your browser is doing the math. For the few features requiring our cloud nodes, data is transferred securely over TLS and dumped immediately after processing. We don't want to pay to store your random files, and we don't use them to train our internal models."
    }
  ]
};

const Accordion = ({ items, categoryColor }: { items: FAQItem[], categoryColor: string }) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openItems.has(index);
        return (
          <motion.div
            key={index}
            className={`bg-gradient-to-r from-gray-900/60 to-gray-800/40 backdrop-blur-md rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-white/5 hover:border-white/20'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-300 group"
              aria-expanded={isOpen}
            >
              <span className={`font-semibold pr-4 transition-colors duration-300 ${isOpen ? 'text-cyan-300' : 'text-gray-200 group-hover:text-white'}`}>{item.q}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-cyan-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}
              >
                <svg className={`w-4 h-4 ${isOpen ? 'text-cyan-400' : categoryColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </button>
            <motion.div
              initial={false}
              animate={{ 
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2">
                <p className="text-gray-400 font-light tracking-wide leading-relaxed text-sm md:text-base">{item.a}</p>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Object.keys(faqData);
  const categoryColors = {
    'The Studio': 'text-blue-400',
    'Neural Processing': 'text-purple-400',
    'Spatial Computing': 'text-red-400',
    'Classified Operations': 'text-green-500',
    'Telemetry & Privacy': 'text-yellow-400'
  };

  const filteredData = () => {
    let filtered = selectedCategory === 'all' ? 
      Object.entries(faqData).reduce((acc, [category, items]) => {
        acc[category] = items;
        return acc;
      }, {} as { [key: string]: FAQItem[] }) :
      { [selectedCategory]: faqData[selectedCategory] };

    if (searchTerm) {
      Object.keys(filtered).forEach(category => {
        filtered[category] = filtered[category].filter(item =>
          item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.a.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered[category].length === 0) {
          delete filtered[category];
        }
      });
    }

    return filtered;
  };

  return (
    <AnimatedPage>
      <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
        <Header />
        
        <main className="px-4 sm:px-6 lg:px-8 flex flex-1 justify-center py-12">
          <div className="flex flex-col items-center max-w-5xl flex-1 w-full">
            {/* Header Section */}
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Frequently Asked Questions
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                Find answers to common questions about our AI-powered image processing tools. Can't find what you're looking for? Contact our support team.
              </p>
            </motion.div>

            {/* Search and Filter Section */}
            <motion.div 
              className="w-full mb-8 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Search Bar */}
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl bg-gray-800/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
    ))}
  </div>
            </motion.div>

            {/* FAQ Content */}
            <div className="w-full space-y-8">
              {Object.entries(filteredData()).length === 0 ? (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.923.754-5.346 1.991M12 3v18" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No results found</h3>
                  <p className="text-gray-400">Try adjusting your search terms or category filter.</p>
                </motion.div>
              ) : (
                Object.entries(filteredData()).map(([category, items], categoryIndex) => (
                  <motion.section
                    key={category}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: categoryIndex * 0.1 + 0.3 }}
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${
                        category === 'The Studio' ? 'from-blue-400 to-blue-600' :
                        category === 'Neural Processing' ? 'from-purple-400 to-purple-600' :
                        category === 'Spatial Computing' ? 'from-red-400 to-red-600' :
                        category === 'Classified Operations' ? 'from-green-400 to-green-600' :
                        'from-yellow-400 to-yellow-600'
                      }`}></div>
                      <h2 className={`text-2xl font-bold ${categoryColors[category as keyof typeof categoryColors]}`}>
                        {category}
                      </h2>
                    </div>
                    <Accordion 
                      items={items} 
                      categoryColor={categoryColors[category as keyof typeof categoryColors]}
                    />
                  </motion.section>
                ))
              )}
            </div>

            {/* Contact Section */}
            <motion.div 
              className="w-full mt-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Our support team is here to help you get the most out of Anemoia's AI tools. 
                We typically respond within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 hover:scale-105">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Contact Support</span>
                </button>
                <button className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all duration-200 hover:scale-105">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Join Community</span>
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default FAQPage; 