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
  'Getting Started': [
    {
      q: 'What is Anemoia?',
      a: 'Anemoia is a cutting-edge WebGL Studio that offers GPU-accelerated AI tools for creative professionals. Our platform features advanced image processing, video editing, face swapping, subtitle generation, and 3D visualization tools - all powered by WebGL and WebGPU technology for real-time performance directly in your browser.'
    },
    {
      q: 'Do I need to create an account to use the tools?',
      a: 'You can use most of our core tools without creating an account. However, signing in with Google unlocks additional features, higher processing limits, the ability to save your work, and access to premium tools.'
    },
    {
      q: 'Is Anemoia free to use?',
      a: 'Yes! We offer a generous free tier that includes access to all basic tools with reasonable usage limits. We also offer premium subscriptions for users who need higher limits, faster processing, or advanced features.'
    },
    {
      q: 'What browsers are supported?',
      a: 'Anemoia works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for optimal performance and WebGL/WebGPU feature support. A dedicated GPU is recommended for best performance.'
    }
  ],
  'Image Processing Tools': [
    {
      q: 'What is depth map generation and what can I use it for?',
      a: 'Depth map generation creates a grayscale image representing the distance of surfaces from the camera viewpoint. Lighter areas are closer, darker areas are farther. It\'s useful for 3D modeling, visual effects, AR/VR applications, and creating stunning artistic effects.'
    },
    {
      q: 'How does pose estimation work?',
      a: 'Our pose estimation tool uses MoveNet Lightning to detect up to 17 key body joints in images containing people. It can detect multiple people simultaneously and provides accurate keypoint coordinates, making it perfect for fitness analysis, animation, and motion capture applications.'
    },
    {
      q: 'What makes your AI upscaler different from basic resize tools?',
      a: 'Unlike simple pixel interpolation, our AI upscaler uses Real-ESRGAN (Enhanced Super-Resolution GAN) technology to intelligently predict and generate missing details. This results in sharper, more natural-looking high-resolution images with preserved textures and reduced artifacts.'
    },
    {
      q: 'How does the Face Swap AI work?',
      a: 'Our Face Swap tool uses advanced neural networks and WebGL acceleration to seamlessly swap faces between images. It detects facial features, preserves expressions, and blends skin tones for realistic results. The tool is currently in beta with ongoing improvements to the AI model.'
    },
    {
      q: 'How does the image comparison tool work?',
      a: 'Our advanced image comparison tool uses multiple algorithms including structural similarity (SSIM), mean squared error (MSE), feature detection, and AI-powered object recognition. It provides detailed analysis with difference highlighting, statistical metrics, and can detect objects and text changes.'
    }
  ],
  'Video Tools': [
    {
      q: 'What is Video Caption Studio?',
      a: 'Video Caption Studio is our AI-powered subtitle generation and editing tool. It uses Whisper AI for automatic transcription, supports multiple languages, and provides a professional timeline editor for precise caption timing. Perfect for content creators, educators, and accessibility compliance.'
    },
    {
      q: 'How accurate is the automatic transcription?',
      a: 'Our transcription uses OpenAI\'s Whisper model, which achieves near-human accuracy for clear audio. Accuracy depends on audio quality, background noise, and speaker clarity. The tool supports over 90 languages and can handle multiple speakers, technical terminology, and various accents.'
    },
    {
      q: 'What subtitle formats can I export?',
      a: 'Video Caption Studio supports industry-standard formats including SRT (SubRip), VTT (WebVTT), and more formats coming soon. You can customize styling, positioning, and timing before export. All exports maintain frame-accurate synchronization.'
    },
    {
      q: 'Is there a video editor available?',
      a: 'Yes! We\'re developing a comprehensive video editor with timeline editing, transitions, effects, and GPU-accelerated rendering. It\'s currently in active development and will be released soon. Early access may be available for premium users.'
    }
  ],
  '3D & Graphics Tools': [
    {
      q: 'What is the 3D Splat Viewer?',
      a: 'Our 3D Splat Viewer is a WebGL-powered renderer for cutting-edge 3D formats including Gaussian Splats, Triangle Splats, and PLY point clouds. It supports real-time rendering of photorealistic 3D captures and is perfect for viewing NeRF outputs and 3D scans.'
    },
    {
      q: 'Can I view my own 3D models?',
      a: 'Yes! The Splat Viewer supports uploading your own .splat, .ply, and compatible 3D files. We handle models up to 500MB with optimized WebGL rendering. Larger files may require compression or decimation for smooth browser performance.'
    },
    {
      q: 'What makes your 3D rendering special?',
      a: 'We use custom WebGL shaders optimized for modern GPUs, supporting millions of points/splats with real-time performance. Our renderer includes advanced features like adaptive level-of-detail, frustum culling, and GPU-based sorting for optimal performance.'
    }
  ],
  'Technical & Privacy': [
    {
      q: 'How is my data handled and stored?',
      a: 'Your privacy is our priority. Images and videos are processed locally using WebGL when possible. For cloud features, files are encrypted, processed securely, and automatically deleted after processing. We never use your content for training without explicit consent.'
    },
    {
      q: 'Why is the first use of a tool slower than subsequent uses?',
      a: 'The first time you use a tool, we need to load the AI model and initialize WebGL resources, which can take a few seconds. Once loaded, models are cached in your browser for much faster processing on subsequent uses during your session.'
    },
    {
      q: 'What file formats are supported?',
      a: 'We support common formats: Images (JPEG, PNG, WebP, GIF), Videos (MP4, WebM, MOV), 3D files (PLY, SPLAT). File size limits vary by tool but generally support files up to 100MB for images and 500MB for videos.'
    },
    {
      q: 'Can I use the API for my applications?',
      a: 'We\'re currently developing API access for developers. If you\'re interested in integrating our tools into your applications, please contact us for early access information and documentation.'
    }
  ],
  'Troubleshooting': [
    {
      q: 'My image/video processing failed. What should I do?',
      a: 'First, ensure your file is in a supported format and under the size limit. Check your internet connection and browser console for errors. Try refreshing the page and clearing browser cache. If issues persist, contact support with error details.'
    },
    {
      q: 'The tool is loading slowly or not responding.',
      a: 'Performance depends on your GPU, file size, and browser. Try: 1) Using a smaller file, 2) Closing other GPU-intensive tabs, 3) Updating your graphics drivers, 4) Using Chrome/Edge for best WebGL performance, 5) Disabling browser extensions that might interfere.'
    },
    {
      q: 'Can I process multiple files at once?',
      a: 'Currently, most tools process one file at a time for optimal quality. Batch processing is available for some tools in premium tier. Video Caption Studio supports queue processing for multiple videos.'
    },
    {
      q: 'Why can\'t I see my results?',
      a: 'Check your browser\'s download settings and popup blocker. Results might be blocked by security settings. Try right-clicking the download button and selecting "Save as". Ensure you have sufficient disk space for downloads.'
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
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-white pr-4">{item.q}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <svg className={`w-5 h-5 ${categoryColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </button>
            <motion.div
              initial={false}
              animate={{ 
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <p className="text-gray-300 leading-relaxed">{item.a}</p>
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
    'Getting Started': 'text-blue-400',
    'Image Processing Tools': 'text-purple-400',
    'Video Tools': 'text-green-400',
    '3D & Graphics Tools': 'text-red-400',
    'Technical & Privacy': 'text-yellow-400',
    'Troubleshooting': 'text-indigo-400'
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
                        category === 'Getting Started' ? 'from-blue-400 to-blue-600' :
                        category === 'Image Processing Tools' ? 'from-purple-400 to-purple-600' :
                        category === 'Video Tools' ? 'from-green-400 to-green-600' :
                        category === '3D & Graphics Tools' ? 'from-red-400 to-red-600' :
                        category === 'Technical & Privacy' ? 'from-yellow-400 to-yellow-600' :
                        'from-indigo-400 to-indigo-600'
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