import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface AnimeImage {
  id: string;
  name: string;
  category: string;
  url: string;
  filename: string;
}

interface Category {
  name: string;
  count: number;
  color: string;
  icon: string;
}

const AnimeGalleryPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<AnimeImage | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category'>('name');

  // Sample data - In real implementation, this would come from GitHub API
  const categories: Category[] = [
    { name: 'C', count: 45, color: 'from-blue-500 to-cyan-500', icon: 'code' },
    { name: 'C++', count: 38, color: 'from-purple-500 to-pink-500', icon: 'developer_mode' },
    { name: 'Python', count: 52, color: 'from-green-500 to-emerald-500', icon: 'psychology' },
    { name: 'JavaScript', count: 34, color: 'from-yellow-500 to-orange-500', icon: 'javascript' },
    { name: 'Rust', count: 29, color: 'from-red-500 to-orange-500', icon: 'security' },
    { name: 'Java', count: 31, color: 'from-orange-500 to-red-500', icon: 'coffee' },
    { name: 'Go', count: 22, color: 'from-cyan-500 to-blue-500', icon: 'speed' },
    { name: 'Haskell', count: 26, color: 'from-purple-500 to-indigo-500', icon: 'functions' },
    { name: 'SICP', count: 18, color: 'from-indigo-500 to-purple-500', icon: 'school' },
    { name: 'Algorithms', count: 15, color: 'from-teal-500 to-green-500', icon: 'account_tree' },
    { name: 'Math', count: 12, color: 'from-pink-500 to-rose-500', icon: 'calculate' },
    { name: 'Mixed', count: 20, color: 'from-gray-500 to-slate-500', icon: 'auto_awesome' }
  ];

  const sampleImages: AnimeImage[] = [
    {
      id: '1',
      name: 'Makise Kurisu Holding C Programming Language',
      category: 'C',
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/C/Makise%20Kurisu%20Holding%20C%20Programming%20Language.png',
      filename: 'Makise_Kurisu_Holding_C_Programming_Language.png'
    },
    {
      id: '2', 
      name: 'Lain SICP',
      category: 'SICP',
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/SICP/Iwakura%20Lain%20SICP.png',
      filename: 'Iwakura_Lain_SICP.png'
    },
    {
      id: '3',
      name: 'Kanna Kamui Finds Rust Programming',
      category: 'Rust', 
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/Rust/Kanna%20Kamui%20Finds%20RUST%20programming.png',
      filename: 'Kanna_Kamui_Finds_RUST_programming.png'
    },
    {
      id: '4',
      name: 'Mai Sakurajima Holding Eloquent Javascript',
      category: 'JavaScript',
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/Javascript/Mai%20Sakurajima%20Holding%20Eloquent%20Javascript.png',
      filename: 'Mai_Sakurajima_Holding_Eloquent_Javascript.png'
    },
    {
      id: '5',
      name: 'Kagome With Python',
      category: 'Python',
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/Python/kagome%20with%20python.png',
      filename: 'kagome_with_python.png'
    },
    {
      id: '6',
      name: 'Sakura Nene CPP',
      category: 'C++',
      url: 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/C%2B%2B/Sakura%20Nene%20CPP.png',
      filename: 'Sakura_Nene_CPP.png'
    }
  ];

  const filteredImages = useMemo(() => {
    let filtered = sampleImages;
    
    if (selectedCategory) {
      filtered = filtered.filter(img => img.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.category.localeCompare(b.category);
    });
  }, [selectedCategory, searchTerm, sortBy]);

  const handleCategorySelect = (category: string) => {
    setIsLoading(true);
    setSelectedCategory(category === selectedCategory ? null : category);
    setTimeout(() => setIsLoading(false), 500);
  };



  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0, 255, 255, 0.3) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Scanning Lines Effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-10"
        animate={{
          backgroundPosition: ['0px 0px', '0px 100vh']
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent 98%, rgba(0, 255, 255, 0.8) 100%)',
          backgroundSize: '100% 3px'
        }}
      />

      <div className="layout-container flex h-full grow flex-col relative z-10">
        <Header />
        
        <main className="flex-1 px-6 md:px-10 lg:px-20 xl:px-40 py-8">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center justify-center shadow-2xl border-2 border-cyan-300"
            >
              <span className="material-symbols-outlined text-black text-4xl font-bold">collections</span>
            </motion.div>
            
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 tracking-tighter bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 30px rgba(0, 255, 255, 0.5)' }}
            >
              ANIME GALLERY
            </motion.h1>
            
            <motion.div 
              className="text-xl md:text-2xl text-cyan-300 font-mono mb-8"
              animate={{ 
                textShadow: [
                  '0 0 5px rgba(0, 255, 255, 0.8)',
                  '0 0 20px rgba(0, 255, 255, 0.8)',
                  '0 0 5px rgba(0, 255, 255, 0.8)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              &gt; Programming Books Collection Database_
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed"
            >
              Access the legendary archive of anime characters holding programming books. 
              Each image categorized, searchable, and ready for deployment in your next project.
            </motion.p>
          </motion.div>

          {/* Search & Controls */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 bg-black/30 rounded-xl p-6 border border-cyan-500/30 backdrop-blur-md"
          >
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  placeholder="Search database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/50 border border-cyan-500/50 rounded-lg px-4 py-3 text-cyan-100 placeholder-cyan-400/70 focus:border-cyan-400 focus:outline-none font-mono"
                  style={{ boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.1)' }}
                />
                <span className="absolute right-3 top-3 material-symbols-outlined text-cyan-400">search</span>
              </div>
              
              <div className="flex gap-3">
                <motion.select
                  whileHover={{ scale: 1.05 }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'category')}
                  className="bg-black/50 border border-purple-500/50 rounded-lg px-4 py-3 text-purple-100 focus:border-purple-400 focus:outline-none font-mono"
                >
                  <option value="name">Sort by Name</option>
                  <option value="category">Sort by Category</option>
                </motion.select>
                
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white p-3 rounded-lg border border-purple-400 shadow-lg"
                >
                  <span className="material-symbols-outlined">
                    {viewMode === 'grid' ? 'list' : 'grid_view'}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-cyan-300 mb-6 font-mono flex items-center">
              <span className="material-symbols-outlined mr-2">folder</span>
              PROGRAMMING_CATEGORIES
            </h2>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {categories.map((category) => (
                <motion.button
                  key={category.name}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                  onClick={() => handleCategorySelect(category.name)}
                  className={`relative group overflow-hidden rounded-xl p-4 border-2 transition-all duration-300 ${
                    selectedCategory === category.name
                      ? 'border-cyan-400 bg-cyan-400/20'
                      : 'border-gray-600 hover:border-gray-400 bg-black/20'
                  }`}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.4)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                  
                  <div className="relative z-10">
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white text-sm">{category.icon}</span>
                    </div>
                    <div className="text-sm font-bold text-gray-100 mb-1">{category.name}</div>
                    <div className="text-xs text-cyan-400 font-mono">{category.count} files</div>
                  </div>
                  
                  {selectedCategory === category.name && (
                    <motion.div
                      layoutId="selected-category"
                      className="absolute inset-0 border-2 border-cyan-400 rounded-xl"
                      style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.6)' }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <div className="flex items-center space-x-4 text-cyan-400">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
                  />
                  <span className="font-mono text-lg">ACCESSING DATABASE...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Gallery */}
          {!isLoading && (
            <motion.div
              className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {filteredImages.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                  className="group relative cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative overflow-hidden rounded-xl bg-black/40 border border-gray-600 hover:border-cyan-400 transition-all duration-300">
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-mono ${
                          categories.find(c => c.name === image.category)?.color 
                            ? `bg-gradient-to-r ${categories.find(c => c.name === image.category)?.color} text-white`
                            : 'bg-gray-600 text-gray-200'
                        }`}>
                          {image.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                        {image.name}
                      </h3>
                    </div>

                    {/* Hover Effects */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute top-2 right-2">
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-black text-sm">zoom_in</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* No Results */}
          {!isLoading && filteredImages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <span className="material-symbols-outlined text-6xl text-gray-500 mb-4 block">search_off</span>
              <h3 className="text-xl font-bold text-gray-400 mb-2">No results found</h3>
              <p className="text-gray-500">Try adjusting your search or category filter</p>
            </motion.div>
          )}

        </main>
        
        <Footer />
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-4xl w-full max-h-[90vh] bg-black/80 rounded-xl border border-cyan-400 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-cyan-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-cyan-300 mb-2">{selectedImage.name}</h2>
                    <span className="text-sm text-gray-400 font-mono">{selectedImage.filename}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedImage(null)}
                    className="w-10 h-10 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white">close</span>
                  </motion.button>
                </div>
              </div>
              
              <div className="p-6">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="w-full h-auto max-h-[60vh] object-contain mx-auto rounded-lg"
                />
                
                <div className="mt-6 flex gap-4">
                  <motion.a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 px-6 rounded-lg font-semibold text-center transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="material-symbols-outlined mr-2">download</span>
                    Download
                  </motion.a>
                  <motion.button
                    onClick={() => navigator.clipboard.writeText(selectedImage.url)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 px-6 rounded-lg font-semibold transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="material-symbols-outlined mr-2">content_copy</span>
                    Copy URL
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeGalleryPage; 