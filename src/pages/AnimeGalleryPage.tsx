import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TerminalWindow, 
  TerminalButton, 
  TerminalInput, 
  TerminalLoader,
  ASCIITitle,
  HolographicDisplay 
} from '../components/terminal/TerminalComponents';

// --- Interfaces & Types ---
interface AnimeImage {
  id: string;
  name: string;
  category: string;
  url: string;
  path: string;
  size?: number;
  lastModified?: string;
}

interface Category {
  name: string;
  count: number;
  icon: string;
}

// --- Constants ---
const REPO_API_URL = 'https://api.github.com/repos/cat-milk/Anime-Girls-Holding-Programming-Books/git/trees/master?recursive=1';
const REPO_CONTENTS_URL = 'https://api.github.com/repos/cat-milk/Anime-Girls-Holding-Programming-Books/contents';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/cat-milk/Anime-Girls-Holding-Programming-Books/master/';
const IGNORED_DIRS = ['.github', 'Mixed', 'Memes', 'Other', 'Uncategorized', 'Personification'];

// Image cache for better performance
const imageCache = new Map<string, string>();

// Category icons mapping
const CATEGORY_ICONS: { [key: string]: string } = {
  'Algol': '⟨A⟩',
  'Assembly': '⟨ASM⟩',
  'Bash': '⟨$⟩',
  'C': '⟨C⟩',
  'C++': '⟨C++⟩',
  'C#': '⟨C#⟩',
  'CSS': '⟨CSS⟩',
  'Go': '⟨GO⟩',
  'Haskell': '⟨λ⟩',
  'HTML': '⟨</>⟩',
  'Java': '⟨☕⟩',
  'JavaScript': '⟨JS⟩',
  'Kotlin': '⟨K⟩',
  'Lisp': '⟨()⟩',
  'PHP': '⟨PHP⟩',
  'Python': '⟨🐍⟩',
  'R': '⟨R⟩',
  'Ruby': '⟨💎⟩',
  'Rust': '⟨🦀⟩',
  'Swift': '⟨🦉⟩',
  'TypeScript': '⟨TS⟩',
  'default': '⟨📚⟩'
};

// Lazy Image Component
const LazyImage: React.FC<{ src: string; alt: string; className?: string; onClick?: () => void }> = ({ 
  src, 
  alt, 
  className,
  onClick 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Check cache first
            if (imageCache.has(src)) {
              setImageSrc(imageCache.get(src)!);
              setLoading(false);
            } else {
              // Load image
              const img = new Image();
              img.src = src;
              img.onload = () => {
                imageCache.set(src, src);
                setImageSrc(src);
                setLoading(false);
              };
              img.onerror = () => {
                setError(true);
                setLoading(false);
              };
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={imgRef} className={`relative ${className}`} onClick={onClick}>
      {loading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-cyan-400 text-xs animate-pulse">LOADING...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
          <div className="text-red-400 text-xs">ERROR</div>
        </div>
      )}
      {imageSrc && !error && (
        <img 
          src={imageSrc} 
          alt={alt} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
};

// --- Main Component ---
const AnimeGalleryPage: React.FC = () => {
  const [allImages, setAllImages] = useState<AnimeImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AnimeImage | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'terminal'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryScrollProgress, setCategoryScrollProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('terminalSounds') === 'true';
  });
  const consoleRef = useRef<HTMLDivElement>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'AGHPB TERMINAL v2.0.1 - ANIME GIRLS HOLDING PROGRAMMING BOOKS',
    '===============================================',
    'Type "help" for available commands',
    ''
  ]);

  // Auto-scroll console when new output is added
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Sound effects
  const playSound = useCallback((soundType: 'click' | 'type' | 'error' | 'success' | 'beep') => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (soundType) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
      case 'type':
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.05;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.02);
        break;
      case 'error':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'success':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'beep':
        oscillator.frequency.value = 1000;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
    }
  }, [soundEnabled]);

  // Fetch images from GitHub
  const fetchImages = useCallback(async () => {
      try {
      setLoadingProgress(10);
        const response = await fetch(REPO_API_URL);
        if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`);
        
      setLoadingProgress(30);
        const data = await response.json();
        
      setLoadingProgress(50);
        const imagePaths = data.tree
          .map((node: { path: string; type: string }) => node.path)
          .filter(
            (path: string) =>
              (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) &&
              !IGNORED_DIRS.some(dir => path.startsWith(dir + '/'))
          );

        const imageMap: { [key: string]: AnimeImage[] } = {};
        const categoryMap: { [key: string]: number } = {};

      setLoadingProgress(70);
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
            path: path,
            };

            if (!imageMap[category]) imageMap[category] = [];
            imageMap[category].push(image);

            categoryMap[category] = (categoryMap[category] || 0) + 1;
          }
        });
        
      setLoadingProgress(90);
        const allImageData = Object.values(imageMap).flat();
        const categoryData = Object.entries(categoryMap)
        .map(([name, count]) => ({ 
          name, 
          count,
          icon: CATEGORY_ICONS[name] || CATEGORY_ICONS.default
        }))
          .sort((a, b) => b.count - a.count);

        setAllImages(allImageData);
        setCategories(categoryData);
      setLoadingProgress(100);
      
      setTimeout(() => setIsLoading(false), 500);
      
      addTerminalOutput(`Successfully loaded ${allImageData.length} images across ${categoryData.length} categories`);

      } catch (error) {
        console.error("Failed to fetch image data:", error);
      addTerminalOutput(`ERROR: Failed to fetch image data - ${error}`);
      setIsLoading(false);
    }
  }, []);

  // Helper functions
  const addTerminalOutput = (output: string | string[]) => {
    setTerminalOutput(prev => [
      ...prev,
      ...(Array.isArray(output) ? output : [output])
    ]);
  };

  const downloadImage = async (image: AnimeImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.name}.${image.path.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addTerminalOutput(`ERROR: Failed to download ${image.name}`);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    addTerminalOutput('Refreshing image database...');
    await fetchImages();
    setIsRefreshing(false);
    addTerminalOutput('Database refresh complete');
  }, [fetchImages]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement) return;
      
      switch(e.key) {
        case '1':
          setViewMode('grid');
          addTerminalOutput('View mode: GRID');
          break;
        case '2':
          setViewMode('list');
          addTerminalOutput('View mode: LIST');
          break;
        case '3':
          setViewMode('terminal');
          addTerminalOutput('View mode: TERMINAL');
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRefresh();
          }
          break;
        case '/':
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          searchInput?.focus();
          break;
        case 'Escape':
          setSelectedImage(null);
          break;
        case '?':
          addTerminalOutput([
            'KEYBOARD SHORTCUTS:',
            '  1 - Grid view',
            '  2 - List view',
            '  3 - Terminal view',
            '  / - Focus search',
            '  Ctrl+R - Refresh',
            '  ESC - Close image',
            '  S - Toggle sounds',
            '  ? - Show this help'
          ]);
          break;
        case 's':
          const newSoundState = !soundEnabled;
          setSoundEnabled(newSoundState);
          localStorage.setItem('terminalSounds', String(newSoundState));
          addTerminalOutput(`Sound effects: ${newSoundState ? 'ENABLED' : 'DISABLED'}`);
          playSound(newSoundState ? 'success' : 'click');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  // Terminal command handler
  const handleCommand = useCallback((cmd: string) => {
    const command = cmd.toLowerCase().trim();
    const args = command.split(' ');
    
    addTerminalOutput(`> ${cmd}`);
    playSound('type');

    switch (args[0]) {
      case 'help':
        addTerminalOutput([
          'Available commands:',
          '  help                - Show this help message',
          '  ls [category]       - List images or categories',
          '  cd <category>       - Change to category',
          '  search <term>       - Search for images',
          '  view <mode>         - Change view mode (grid/list/terminal)',
          '  download <id>       - Download an image',
          '  refresh             - Refresh image database',
          '  clear               - Clear terminal',
          '  stats               - Show statistics'
        ]);
        break;
        
      case 'ls':
        if (args[1] || selectedCategory) {
          const category = args[1] || selectedCategory;
          const images = allImages.filter(img => img.category === category);
          if (images.length > 0) {
            addTerminalOutput(`Images in ${category}:`);
            images.forEach(img => {
              addTerminalOutput(`  [${img.id}] ${img.name}`);
            });
          } else {
            addTerminalOutput(`No images found in category: ${category}`);
          }
        } else {
          addTerminalOutput('Categories:');
          categories.forEach(cat => {
            addTerminalOutput(`  ${cat.icon} ${cat.name} (${cat.count} images)`);
          });
        }
        break;
        
      case 'cd':
        if (args[1]) {
          const category = categories.find(cat => 
            cat.name.toLowerCase() === args[1].toLowerCase()
          );
          if (category) {
            setSelectedCategory(category.name);
            addTerminalOutput(`Changed to category: ${category.name}`);
          } else if (args[1] === '..') {
            setSelectedCategory(null);
            addTerminalOutput('Changed to root directory');
          } else {
            addTerminalOutput(`Category not found: ${args[1]}`);
          }
        } else {
          addTerminalOutput('Usage: cd <category>');
        }
        break;
        
      case 'search':
        if (args.length > 1) {
          const searchQuery = args.slice(1).join(' ');
          setSearchTerm(searchQuery);
          const results = allImages.filter(img => 
            img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            img.category.toLowerCase().includes(searchQuery.toLowerCase())
          );
          addTerminalOutput(`Found ${results.length} results for "${searchQuery}"`);
        } else {
          addTerminalOutput('Usage: search <term>');
        }
        break;
        
      case 'view':
        if (args[1] && ['grid', 'list', 'terminal'].includes(args[1])) {
          setViewMode(args[1] as 'grid' | 'list' | 'terminal');
          addTerminalOutput(`View mode changed to: ${args[1]}`);
        } else {
          addTerminalOutput('Usage: view <grid|list|terminal>');
        }
        break;
        
      case 'download':
        if (args[1]) {
          const image = allImages.find(img => img.id === args[1]);
          if (image) {
            downloadImage(image);
            addTerminalOutput(`Downloading: ${image.name}`);
          } else {
            addTerminalOutput(`Image not found: ${args[1]}`);
          }
        } else {
          addTerminalOutput('Usage: download <image-id>');
        }
        break;
        
      case 'refresh':
        handleRefresh();
        break;
        
      case 'clear':
        setTerminalOutput([]);
        break;
        
      case 'stats':
        addTerminalOutput([
          'Database Statistics:',
          `  Total Images: ${allImages.length}`,
          `  Categories: ${categories.length}`,
          `  Largest Category: ${categories[0]?.name} (${categories[0]?.count} images)`,
          `  Current Filter: ${searchTerm || 'None'}`,
          `  Selected Category: ${selectedCategory || 'All'}`
        ]);
        break;
        
      default:
        addTerminalOutput(`Command not found: ${args[0]}`);
    }
    
    setCommandInput('');
  }, [allImages, categories, selectedCategory, searchTerm, playSound]);



  // Filtered images based on search and category
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

  // Loading screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <TerminalWindow title="SYSTEM BOOT" className="w-96">
          <div className="p-8">
            <ASCIITitle text="AGHPB" />
            <div className="mt-8">
              <TerminalLoader 
                text="INITIALIZING DATABASE" 
                progress={loadingProgress}
          />
        </div>
          </div>
        </TerminalWindow>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
        backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      
      {/* Main Layout */}
      <div className="relative z-10 flex h-screen">
        {/* Left Sidebar - Categories & Terminal */}
        <div className="w-80 border-r-2 border-cyan-500/30 flex flex-col bg-black/90 h-full">
          {/* Categories Section */}
          <div className="flex-1 min-h-0 m-4">
            <TerminalWindow title="CATEGORIES" className="h-full flex flex-col">
              {/* Category Stats */}
              <div className="px-4 pt-2 pb-1 border-b border-cyan-500/20 text-xs flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300">TOTAL: {categories.length} LANGUAGES</span>
                  <span className="text-green-400">● INDEXED</span>
                </div>
              </div>
              
              {/* Scrollable Categories */}
              <div className="flex-1 min-h-0 p-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <TerminalButton
                    onClick={() => {
                      playSound('click');
                      setSelectedCategory(null);
                    }}
                    variant={!selectedCategory ? 'primary' : 'secondary'}
                    className="w-full text-xs px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span>⟨ALL⟩ SHOW ALL</span>
                      <span className="text-cyan-300">({allImages.length})</span>
                    </div>
                  </TerminalButton>
                  
                  {categories.map((cat, index) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <TerminalButton
                        onClick={() => {
                          playSound('click');
                          setSelectedCategory(cat.name);
                        }}
                        variant={selectedCategory === cat.name ? 'primary' : 'secondary'}
                        className="w-full text-xs px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <span className="mr-2">{cat.icon}</span>
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="text-cyan-300 ml-2">({cat.count})</span>
                        </div>
                      </TerminalButton>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Scroll Indicator */}
              <div className="px-4 py-1 border-t border-cyan-500/20 text-xs text-center flex-shrink-0">
                <span className="text-cyan-400 animate-pulse">↕ SCROLL FOR MORE</span>
              </div>
            </TerminalWindow>
          </div>
          
          {/* Terminal Console */}
          <div className="h-96 m-4 mt-0">
            <TerminalWindow title="CONSOLE" className="h-full flex flex-col">
              {/* Console Output */}
              <div 
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2"
                ref={consoleRef}
              >
                {terminalOutput.map((line, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-green-400 font-mono text-xs leading-relaxed break-all"
                  >
                    {line}
                  </motion.div>
                ))}
                <div className="h-4" />
              </div>
              
              {/* Command Input */}
              <div className="border-t border-cyan-500/20 p-2 flex-shrink-0">
                <TerminalInput
                  value={commandInput}
                  onChange={setCommandInput}
                  onSubmit={() => handleCommand(commandInput)}
                  placeholder="Enter command..."
                  className="text-xs"
                />
                {/* Quick Commands */}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {['help', 'ls', 'stats', 'clear'].map(cmd => (
                    <button
                      key={cmd}
                      onClick={() => handleCommand(cmd)}
                      className="text-xs px-2 py-0.5 bg-cyan-900/30 hover:bg-cyan-800/50 
                               border border-cyan-600/30 text-cyan-400 rounded transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </TerminalWindow>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b-2 border-cyan-500/30 p-4 bg-black/90">
            <div className="flex items-center justify-between">
              <HolographicDisplay>
                <h1 className="text-2xl font-bold tracking-wider">
                  AGHPB DATABASE // {selectedCategory || 'ALL CATEGORIES'}
                </h1>
              </HolographicDisplay>
              
              <div className="flex items-center space-x-4">
                {/* Search Bar */}
                <TerminalInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search images..."
                  prefix="SEARCH>"
                  className="w-64"
                />
                
                {/* Action Buttons */}
                <TerminalButton
                  onClick={() => {
                    playSound('click');
                    handleRefresh();
                  }}
                  variant="success"
                  disabled={isRefreshing}
                  glitch
                >
                  {isRefreshing ? 'REFRESHING...' : '↻ REFRESH'}
                </TerminalButton>
                
                {/* Sound Toggle */}
                <TerminalButton
                  onClick={() => {
                    const newState = !soundEnabled;
                    setSoundEnabled(newState);
                    localStorage.setItem('terminalSounds', String(newState));
                    playSound(newState ? 'success' : 'click');
                  }}
                  variant={soundEnabled ? 'primary' : 'secondary'}
                  className="px-3 py-2"
                >
                  {soundEnabled ? '🔊' : '🔇'}
                </TerminalButton>
                
                {/* View Mode Toggles */}
                <div className="flex space-x-1">
                  <TerminalButton
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                    className="px-3 py-2"
                  >
                    ⊞
                  </TerminalButton>
                  <TerminalButton
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'secondary'}
                    className="px-3 py-2"
                  >
                    ☰
                  </TerminalButton>
                  <TerminalButton
                    onClick={() => setViewMode('terminal')}
                    variant={viewMode === 'terminal' ? 'primary' : 'secondary'}
                    className="px-3 py-2"
                  >
                    ⌘
                  </TerminalButton>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 bg-black/80">
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="aspect-[3/4] bg-black border-2 border-cyan-500/30 rounded overflow-hidden">
                      <LazyImage
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 p-2 w-full">
                          <p className="text-xs truncate">{image.name}</p>
                          <p className="text-xs text-cyan-300">{image.category}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-1">
                {filteredImages.map((image) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center p-2 bg-black/50 border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <LazyImage
                      src={image.url}
                      alt={image.name}
                      className="w-16 h-16 object-cover border border-cyan-500/30"
                    />
                    <div className="ml-4 flex-1">
                      <p className="font-mono">{image.name}</p>
                      <p className="text-sm text-cyan-400">{image.category} • ID: {image.id}</p>
                    </div>
                    <TerminalButton
                      onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                        e?.stopPropagation();
                        downloadImage(image);
                      }}
                      variant="success"
                      className="px-3 py-1 text-xs"
                    >
                      DOWNLOAD
                    </TerminalButton>
                  </motion.div>
                ))}
              </div>
            )}

            {viewMode === 'terminal' && (
              <pre className="text-xs text-green-400 font-mono">
{`DIRECTORY LISTING: ${selectedCategory || '/'}\n`}
{`TOTAL FILES: ${filteredImages.length}\n\n`}
{filteredImages.map(img => 
`[${img.id}] ${img.name.padEnd(40)} ${img.category.padEnd(15)} <DOWNLOAD>\n`
).join('')}
              </pre>
            )}
          </div>

          {/* Status Bar */}
          <div className="border-t-2 border-cyan-500/30 p-2 bg-black/90 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-green-400">● SYSTEM ONLINE</span>
              <span>{filteredImages.length} FILES</span>
              <span>{categories.length} CATEGORIES</span>
              <span className="text-cyan-400">
                HOTKEYS: ? FOR HELP
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span>VIEW: {viewMode.toUpperCase()}</span>
              <span className="text-cyan-300">v2.0.1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
            onClick={() => setSelectedImage(null)}
          >
            <TerminalWindow 
              title={`IMAGE VIEWER // ${selectedImage.name}`}
              className="max-w-4xl max-h-full"
            >
              <div className="p-4">
                <div className="flex gap-4">
                  <LazyImage
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="max-h-[60vh] object-contain border-2 border-cyan-500/30"
                  />
                  <div className="space-y-4">
                    <div className="space-y-2 font-mono text-sm">
                      <p><span className="text-cyan-400">ID:</span> {selectedImage.id}</p>
                      <p><span className="text-cyan-400">NAME:</span> {selectedImage.name}</p>
                      <p><span className="text-cyan-400">CATEGORY:</span> {selectedImage.category}</p>
                      <p><span className="text-cyan-400">PATH:</span> {selectedImage.path}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <TerminalButton
                        onClick={() => downloadImage(selectedImage)}
                        variant="success"
                        className="w-full"
                        glitch
                      >
                        ⬇ DOWNLOAD IMAGE
                      </TerminalButton>
                      <TerminalButton
                        onClick={() => window.open(selectedImage.url, '_blank')}
                        variant="primary"
                        className="w-full"
                      >
                        ⧉ OPEN IN NEW TAB
                      </TerminalButton>
                      <TerminalButton
                        onClick={() => setSelectedImage(null)}
                        variant="danger"
                        className="w-full"
                      >
                        ✕ CLOSE
                      </TerminalButton>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalWindow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeGalleryPage; 