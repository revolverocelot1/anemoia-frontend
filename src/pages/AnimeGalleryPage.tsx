import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces & Types ---
interface AnimeImage {
  id: string;
  name: string;
  category: string;
  url: string;
}

interface Category {
  name: string;
  count: number;
}

// --- Constants ---
const REPO_API_URL = 'https://api.github.com/repos/cat-milk/Anime-Girls-Holding-Programming-Books/git/trees/master?recursive=1';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/';
const IGNORED_DIRS = ['.github', 'Mixed', 'Memes', 'Other', 'Uncategorized', 'Personification'];

// --- Helper Components ---
const GlitchText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`relative inline-block ${className}`}>
    <span className="absolute inset-0 text-red-500 animate-glitch-1">{children}</span>
    <span className="absolute inset-0 text-blue-500 animate-glitch-2">{children}</span>
    <span className="relative">{children}</span>
  </div>
);

const ScanningLine: React.FC = () => (
  <motion.div
    className="absolute top-0 left-0 w-full h-1 bg-cyan-400/80 shadow-[0_0_10px_theme(colors.cyan.400)]"
    initial={{ y: '-100%' }}
    animate={{ y: '100vh' }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
  />
);

const TextDecoder: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [decodedText, setDecodedText] = useState('');

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%$#@';
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    timeout = setTimeout(() => {
      let iteration = 0;
      interval = setInterval(() => {
        setDecodedText(
          text
            .split('')
            .map((_char, index) => {
              if (index < iteration) {
                return text[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('')
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3;
      }, 30);
    }, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [text, delay]);

  return <>{decodedText}</>;
};

// --- Main Page Component ---
const AnimeGalleryPage: React.FC = () => {
  const [allImages, setAllImages] = useState<AnimeImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('INITIATING_CONNECTION');
  const [selectedImage, setSelectedImage] = useState<AnimeImage | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingStatus('CONNECTING_TO_GH_API...');
        const response = await fetch(REPO_API_URL);
        if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`);
        
        setLoadingStatus('PARSING_TREE_STRUCTURE...');
        const data = await response.json();
        
        setLoadingStatus('FILTERING_IMAGE_PATHS...');
        const imagePaths = data.tree
          .map((node: { path: string; type: string }) => node.path)
          .filter(
            (path: string) =>
              (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) &&
              !IGNORED_DIRS.some(dir => path.startsWith(dir + '/'))
          );

        const imageMap: { [key: string]: AnimeImage[] } = {};
        const categoryMap: { [key: string]: number } = {};

        setLoadingStatus('BUILDING_IMAGE_DATABASE...');
        imagePaths.forEach((path: string, index: number) => {
          const parts = path.split('/');
          if (parts.length > 1) {
            const category = parts[0];
            const name = parts[1].split('.')[0].replace(/_/g, ' ');
            
            const image: AnimeImage = {
              id: `${category}-${index}`,
              category,
              name,
              url: `${IMAGE_BASE_URL}${path}`,
            };

            if (!imageMap[category]) imageMap[category] = [];
            imageMap[category].push(image);

            categoryMap[category] = (categoryMap[category] || 0) + 1;
          }
        });
        
        const allImageData = Object.values(imageMap).flat();
        const categoryData = Object.entries(categoryMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setAllImages(allImageData);
        setCategories(categoryData);
        setLoadingStatus('DATABASE_LOADED');
        setTimeout(() => setIsLoading(false), 1000);

      } catch (error) {
        console.error("Failed to fetch image data:", error);
        setLoadingStatus('ERROR: CONNECTION_FAILED');
      }
    };

    fetchImages();
  }, []);

  const filteredImages = useMemo(() => {
    return allImages
      .filter(image => {
        const categoryMatch = selectedCategory ? image.category === selectedCategory : true;
        const searchMatch = searchTerm
          ? image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            image.category.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        return categoryMatch && searchMatch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allImages, selectedCategory, searchTerm]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black text-cyan-400 font-mono flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/50 via-black to-black opacity-50" />
        <GlitchText className="text-4xl font-black mb-4 tracking-widest">A.G.H.P.B. ARCHIVE</GlitchText>
        <div className="w-1/2 h-1 bg-cyan-400/20 mb-4" />
        <div className="text-lg">
          <TextDecoder text={loadingStatus} />
        </div>
        <div className="w-1/3 mt-4 h-2 bg-black border border-cyan-400 p-0.5">
          <motion.div
            className="h-full bg-cyan-400"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 15, ease: 'linear' }}
          />
        </div>
        <div className="absolute bottom-4 text-xs text-gray-500">SYSTEM BOOT SEQUENCE INITIATED...</div>
      </div>
    );
  }

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-black text-cyan-400 font-mono overflow-hidden">
      <ScanningLine />
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 150, 255, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 150, 255, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}/>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black to-black" />

      <div className="relative z-10 flex flex-col h-screen">
        <header className="flex-shrink-0 p-4 border-b border-cyan-400/30 flex justify-between items-center backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-widest">
            <TextDecoder text="HOLOGRAPHIC ARCHIVE: AGHPB" />
          </h1>
          <div className="flex items-center space-x-2 text-green-400">
            <motion.div 
              className="w-3 h-3 bg-green-400 rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span>SYSTEM_ONLINE</span>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* Left Panel: Categories & Search */}
          <aside className="col-span-3 flex flex-col space-y-4 overflow-y-auto pr-2">
            <div className="border border-cyan-400/30 p-2">
              <h2 className="text-lg mb-2">
                <TextDecoder text="<SEARCH>" />
              </h2>
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-cyan-400/50 px-2 py-1 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="border border-cyan-400/30 p-2 flex-1 flex flex-col">
              <h2 className="text-lg mb-2">
                <TextDecoder text="<CATEGORIES>" />
              </h2>
              <div className="flex-1 overflow-y-auto space-y-1">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left p-1 transition-colors ${!selectedCategory ? 'bg-cyan-400 text-black' : 'hover:bg-cyan-400/20'}`}
                >
                  // ALL ({allImages.length})
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full text-left p-1 transition-colors ${selectedCategory === cat.name ? 'bg-cyan-400 text-black' : 'hover:bg-cyan-400/20'}`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Panel: Image View & Grid */}
          <main className="col-span-6 flex flex-col border border-cyan-400/30 p-2">
            <AnimatePresence mode="wait">
              {selectedImage ? (
                <motion.div
                  key={selectedImage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full h-full flex items-center justify-center bg-black/50"
                >
                  <img 
                    src={selectedImage.url} 
                    alt={selectedImage.name} 
                    className="max-w-full max-h-full object-contain"
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500">
                  <span className="text-4xl">NO TARGET SELECTED</span>
                  <p>Select an image from the grid to view details</p>
                </div>
              )}
            </AnimatePresence>
          </main>
          
          {/* Right Panel: Data Readout & Image Grid */}
          <aside className="col-span-3 flex flex-col space-y-4">
            <div className="border border-cyan-400/30 p-2 h-1/3">
              <h2 className="text-lg mb-2">
                <TextDecoder text="<DATA_READOUT>" />
              </h2>
              <AnimatePresence mode="wait">
                {selectedImage ? (
                  <motion.div
                    key={selectedImage.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1 text-sm"
                  >
                    <p>ID: {selectedImage.id}</p>
                    <p>NAME: {selectedImage.name}</p>
                    <p>CATEGORY: {selectedImage.category}</p>
                    <a href={selectedImage.url} target="_blank" rel="noreferrer" className="text-red-500 hover:underline block truncate">
                      URL: {selectedImage.url}
                    </a>
                  </motion.div>
                ) : (
                  <p className="text-gray-500">Awaiting data...</p>
                )}
              </AnimatePresence>
            </div>
            
            <div className="border border-cyan-400/30 p-2 flex-1 flex flex-col">
              <h2 className="text-lg mb-2">
                <TextDecoder text="<IMAGE_GRID>" />
              </h2>
              <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto">
                {filteredImages.map(image => (
                  <motion.div
                    key={image.id}
                    className={`relative aspect-square border-2 transition-colors cursor-pointer ${
                      selectedImage?.id === image.id ? 'border-red-500' : 'border-cyan-400/30 hover:border-cyan-400'
                    }`}
                    onClick={() => setSelectedImage(image)}
                    whileHover={{ scale: 1.05 }}
                    layoutId={image.id}
                  >
                    <img src={image.url} alt={image.name} className="w-full h-full object-cover" loading="lazy" />
                  </motion.div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex-shrink-0 p-2 border-t border-cyan-400/30 flex justify-between items-center text-xs">
          <div>{filteredImages.length} IMAGES LOADED</div>
          <div>SELECTED CATEGORY: {selectedCategory || 'ALL'}</div>
        </footer>
      </div>
    </div>
  );
};

export default AnimeGalleryPage; 