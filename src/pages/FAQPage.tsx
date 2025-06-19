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
      a: 'Anemoia is a comprehensive AI-powered image processing platform that offers advanced tools for depth map generation, pose estimation, image upscaling, and image comparison. Our tools use state-of-the-art machine learning models to provide professional-quality results.'
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
      a: 'Anemoia works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for optimal performance and feature support.'
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
      q: 'How does the image comparison tool work?',
      a: 'Our advanced image comparison tool uses multiple algorithms including structural similarity (SSIM), mean squared error (MSE), feature detection, and AI-powered object recognition. It provides detailed analysis with difference highlighting, statistical metrics, and can detect objects and text changes.'
    }
  ],
  'Technical & Privacy': [
    {
      q: 'How is my data handled and stored?',
      a: 'Your privacy is our priority. Images are processed securely and temporarily stored only during processing. We automatically delete all uploaded images and generated results after a short period. We never use your images for training or any other purposes without explicit consent.'
    },
    {
      q: 'Why is the first use of a tool slower than subsequent uses?',
      a: 'The first time you use a tool, we need to load the AI model into memory, which can take a few seconds. Once loaded, the model is cached for much faster processing on subsequent uses during your session.'
    },
    {
      q: 'What file formats are supported?',
      a: 'We support all common image formats including JPEG, PNG, GIF, and WebP. For best results, we recommend using high-quality images. File size limits vary by tool but generally support files up to 10MB.'
    },
    {
      q: 'Can I use the API for my applications?',
      a: 'We\'re currently developing API access for developers. If you\'re interested in integrating our tools into your applications, please contact us for early access information and documentation.'
    }
  ],
  'Troubleshooting': [
    {
      q: 'My image processing failed. What should I do?',
      a: 'First, ensure your image is in a supported format (JPEG, PNG, GIF) and under the size limit. Try refreshing the page and uploading again. If the problem persists, the image might be too complex or contain unsupported elements. Contact support if you continue experiencing issues.'
    },
    {
      q: 'The tool is loading slowly or not responding.',
      a: 'Slow performance can be caused by large image files, slow internet connection, or high server load. Try using a smaller image, clearing your browser cache, or waiting a few minutes before trying again. Ensure you\'re using a modern browser with JavaScript enabled.'
    },
    {
      q: 'Can I process multiple images at once?',
      a: 'Currently, our tools process one image at a time to ensure optimal quality and speed. Batch processing features are planned for future releases. Premium users will get early access to batch processing capabilities.'
    },
    {
      q: 'Why can\'t I see my downloaded results?',
      a: 'Check your browser\'s download folder or download settings. Some browsers may block automatic downloads - you might need to allow downloads from our site. If you\'re still having trouble, try right-clicking the download button and selecting "Save as".'
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
    'Technical & Privacy': 'text-green-400',
    'Troubleshooting': 'text-red-400'
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
                        category === 'Technical & Privacy' ? 'from-green-400 to-green-600' :
                        'from-red-400 to-red-600'
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