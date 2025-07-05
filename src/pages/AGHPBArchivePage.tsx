import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

interface AnimeImage {
  id: string;
  url: string;
  title: string;
  tags: string[];
  resolution: string;
}

const AGHPBArchivePage = () => {
  const [images, setImages] = useState<AnimeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<AnimeImage | null>(null);

  // Sample anime images data
  const sampleImages: AnimeImage[] = [
    {
      id: '1',
      url: 'https://picsum.photos/400/600?random=1',
      title: 'Cyberpunk Warrior',
      tags: ['cyberpunk', 'action', 'sci-fi'],
      resolution: '1920x1080'
    },
    {
      id: '2',
      url: 'https://picsum.photos/400/600?random=2',
      title: 'Magical Girl',
      tags: ['fantasy', 'magical', 'cute'],
      resolution: '1920x1080'
    },
    {
      id: '3',
      url: 'https://picsum.photos/400/600?random=3',
      title: 'Mecha Pilot',
      tags: ['mecha', 'sci-fi', 'action'],
      resolution: '2560x1440'
    },
    {
      id: '4',
      url: 'https://picsum.photos/400/600?random=4',
      title: 'School Life',
      tags: ['slice-of-life', 'school', 'romance'],
      resolution: '1920x1080'
    },
    {
      id: '5',
      url: 'https://picsum.photos/400/600?random=5',
      title: 'Fantasy Adventure',
      tags: ['fantasy', 'adventure', 'magic'],
      resolution: '3840x2160'
    },
    {
      id: '6',
      url: 'https://picsum.photos/400/600?random=6',
      title: 'Dark Fantasy',
      tags: ['dark', 'fantasy', 'horror'],
      resolution: '1920x1080'
    },
    {
      id: '7',
      url: 'https://picsum.photos/400/600?random=7',
      title: 'Sports Champion',
      tags: ['sports', 'action', 'competition'],
      resolution: '2560x1440'
    },
    {
      id: '8',
      url: 'https://picsum.photos/400/600?random=8',
      title: 'Idol Performance',
      tags: ['music', 'idol', 'cute'],
      resolution: '1920x1080'
    }
  ];

  // Get all unique tags
  const allTags = ['all', ...Array.from(new Set(sampleImages.flatMap(img => img.tags)))];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setImages(sampleImages);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredImages = selectedTag === 'all' 
    ? images 
    : images.filter(img => img.tags.includes(selectedTag));

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        
        <main className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                AGHPB Archive
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                High-quality anime artwork gallery powered by AI generation and curation
              </p>
            </motion.div>

            {/* Tag Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8 overflow-x-auto"
            >
              <div className="flex gap-2 min-w-max pb-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedTag === tag
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Gallery Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="relative overflow-hidden rounded-xl bg-gray-900 aspect-[2/3]">
                      <img
                        src={image.url}
                        alt={image.title}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-semibold text-lg mb-1">{image.title}</h3>
                          <p className="text-gray-300 text-sm">{image.resolution}</p>
                          <div className="flex gap-2 mt-2">
                            {image.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">{images.length}</div>
                <div className="text-gray-400">Total Artworks</div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-pink-400 mb-2">{allTags.length - 1}</div>
                <div className="text-gray-400">Categories</div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">4K</div>
                <div className="text-gray-400">Max Resolution</div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Image Modal */}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="w-full h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-lg">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedImage.title}</h2>
                <p className="text-gray-300 mb-3">{selectedImage.resolution}</p>
                <div className="flex gap-2">
                  {selectedImage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default AGHPBArchivePage; 