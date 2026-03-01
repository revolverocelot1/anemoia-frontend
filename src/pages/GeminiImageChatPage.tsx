import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatImageWithGemini } from '../services/gemini.service';

// Icons
const IconSpark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="currentColor"/>
  </svg>
);

const IconBanana = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.81 4.47c-.8 0-1.54.05-2.24.13C14.93 2.52 13.05 1.14 11 1.14 8.98 1.14 7.17 2.45 6.46 4.39 5.7 4.3 4.91 4.26 4.09 4.26c-1.39 0-2.59.13-3.59.39v11.7c1-.26 2.2-.39 3.59-.39.91 0 1.74.05 2.5.14.76.09 1.45.22 2.05.39.6-.17 1.29-.3 2.05-.39.76-.09 1.59-.14 2.5-.14 1.39 0 2.59.13 3.59.39V4.65c-1-.26-2.2-.39-3.59-.39-.59 0-1.15.02-1.69.07z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMagic = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 2L13 6L9 7.5L13 9L14.5 13L16 9L20 7.5L16 6L14.5 2Z" fill="currentColor"/>
    <path d="M5.5 11L4.5 13.5L2 14.5L4.5 15.5L5.5 18L6.5 15.5L9 14.5L6.5 13.5L5.5 11Z" fill="currentColor"/>
    <path d="M19.5 15L18.5 17L16.5 17.5L18.5 18L19.5 20L20.5 18L22.5 17.5L20.5 17L19.5 15Z" fill="currentColor"/>
  </svg>
);

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1V6M12 18V23M4.22 4.22L7.76 7.76M16.24 16.24L19.78 19.78M1 12H6M18 12H23M4.22 19.78L7.76 16.24M16.24 7.76L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface AdvancedSettings {
  temperature: number;
  topP: number;
  topK: number;
}

function GeminiImageChatPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    temperature: 0.8,
    topP: 0.95,
    topK: 40
  });
  const [showApiKeyDisclaimer, setShowApiKeyDisclaimer] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const fileArr = Array.from(selected).slice(0, 6);
    setFiles(fileArr);
    setImagePreviews(fileArr.map(f => URL.createObjectURL(f)));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectFiles(e.dataTransfer.files);
  };

  const onGenerate = async () => {
    if (!prompt || prompt.trim().length === 0) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    try {
      // Note: In a real implementation, you would pass advanced settings to the API
      const res = await chatImageWithGemini({
        prompt,
        files: files.length > 0 ? files : undefined,
        conversationId,
        isContinuation: !!conversationId,
        outputMimeType: 'image/png'
      });
      setResultImage(`data:image/png;base64,${res.imageBase64}`);
      if (res.conversationId) setConversationId(res.conversationId);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  const clearImages = () => {
    setFiles([]);
    setImagePreviews([]);
  };

  return (
    <div className="relative z-10 min-h-screen w-full">
      {/* API Key Exhaustion Disclaimer */}
      <AnimatePresence>
        {showApiKeyDisclaimer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black bg-opacity-90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setShowApiKeyDisclaimer(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-gradient-to-br from-red-900/90 to-neutral-900/90 border border-red-500/50 rounded-3xl p-8 max-w-md w-full relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Service Temporarily Unavailable</h3>
                  <div className="space-y-3">
                    <p className="text-red-200 leading-relaxed">
                      The Nano Banana Image Chat is currently out of commission due to API key exhaustion. We've reached our usage limits for the Nano Banana (Gemini 2.5 Flash) API.
                    </p>
                    <p className="text-neutral-300 text-sm">
                      We're working on obtaining additional API credits. Please check back later or try our other available tools.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="bg-white text-black font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                      Back to Home
                    </button>
                    <button
                      onClick={() => setShowApiKeyDisclaimer(false)}
                      className="bg-red-500/20 text-red-200 font-medium px-6 py-2.5 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                    >
                      View Anyway
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Deep gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-pink-950/30 to-black"></div>
        
        {/* Animated mesh */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexagon" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2) rotate(0)">
              <polygon points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2" fill="none" stroke="url(#gradient)" strokeWidth="0.5"/>
              <polygon points="0,0 12.5,7.2 12.5,21.7 0,28.9 -12.5,21.7 -12.5,7.2" fill="none" stroke="url(#gradient)" strokeWidth="0.5"/>
              <polygon points="49.5,0 62,7.2 62,21.7 49.5,28.9 37,21.7 37,7.2" fill="none" stroke="url(#gradient)" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
              </stop>
              <stop offset="100%" stopColor="#00ffff" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
              </stop>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagon)" />
        </svg>
        
        {/* Floating orbs */}
        <div className="absolute top-1/3 -left-1/4 w-96 h-96 bg-pink-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 -right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <div className="relative px-6 py-10 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-10 text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-full"
          >
            <IconBanana />
            <span className="text-sm font-bold text-pink-300">Nano Banana AI</span>
            <span className="text-xs text-purple-300">by Google</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
              Image Chat AI
            </span>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
          >
            Powered by <span className="text-pink-400 font-bold">Gemini 2.5 Flash Image</span> (Nano Banana) - 
            The most advanced AI for image generation with <span className="text-purple-400 font-bold">less restrictions</span>
          </motion.p>
          
          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mt-6"
          >
            {[
              { icon: "🍌", text: "Nano Banana", color: "from-yellow-500 to-orange-500" },
              { icon: "⚡", text: "Lightning Fast", color: "from-pink-500 to-purple-500" },
              { icon: "🎨", text: "Creative Freedom", color: "from-purple-500 to-blue-500" },
              { icon: "🔓", text: "Less Censorship", color: "from-green-500 to-cyan-500" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`px-4 py-2 bg-gradient-to-r ${feature.color} bg-opacity-20 backdrop-blur-xl rounded-full border border-white/10`}
              >
                <span className="text-white font-semibold flex items-center gap-2">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-sm">{feature.text}</span>
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Input Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt Input */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 rounded-3xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500"></div>
              
              <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <IconMagic />
                  </div>
                  <h3 className="text-xl font-bold text-white">Creative Prompt</h3>
                </div>
                
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision... Be creative, Nano Banana has fewer limits!"
                  className="w-full h-32 bg-gray-900/50 border border-purple-500/20 rounded-2xl p-4 text-gray-200 placeholder-gray-500 outline-none focus:border-purple-400/40 transition-all resize-none"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <IconSpark />
                    <span className="text-xs text-purple-300 font-medium">AI Model: Gemini 2.5 Flash Image</span>
                  </div>
                  
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-all text-sm font-medium"
                  >
                    <IconSettings />
                    Advanced
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Advanced Settings */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 space-y-4">
                    <h4 className="text-lg font-bold text-white mb-4">Advanced Settings</h4>
                    
                    {/* Temperature */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">Temperature</label>
                        <span className="text-sm text-purple-400 font-mono">{advancedSettings.temperature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={advancedSettings.temperature}
                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <p className="text-xs text-gray-500 mt-1">Controls randomness. Higher = more creative, lower = more focused.</p>
                    </div>
                    
                    {/* Top-p */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">Top-p (Nucleus Sampling)</label>
                        <span className="text-sm text-purple-400 font-mono">{advancedSettings.topP.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={advancedSettings.topP}
                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <p className="text-xs text-gray-500 mt-1">Cumulative probability cutoff. Lower = more focused on likely outputs.</p>
                    </div>
                    
                    {/* Top-k */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">Top-k</label>
                        <span className="text-sm text-purple-400 font-mono">{advancedSettings.topK}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={advancedSettings.topK}
                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, topK: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <p className="text-xs text-gray-500 mt-1">Number of top tokens to consider. Lower = more deterministic.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Upload Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={onDrop}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500"></div>
              
              <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Reference Images</h3>
                    <p className="text-sm text-gray-400 mt-1">Optional - Add up to 6 images for context</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {imagePreviews.length > 0 && (
                      <button
                        onClick={clearImages}
                        className="px-3 py-2 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition-all text-sm font-medium"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
                    >
                      <IconUpload />
                      Select Files
                    </button>
                  </div>
                  
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => onSelectFiles(e.target.files)} 
                  />
                </div>
                
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {imagePreviews.map((src, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative group"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-100 blur transition-all duration-300"></div>
                        <img 
                          src={src} 
                          className="relative w-full h-24 object-cover rounded-xl border border-purple-500/30" 
                          alt={`Reference ${idx + 1}`}
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const newFiles = files.filter((_, i) => i !== idx);
                            const newPreviews = imagePreviews.filter((_, i) => i !== idx);
                            setFiles(newFiles);
                            setImagePreviews(newPreviews);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-purple-500/20 rounded-2xl">
                    <IconUpload />
                    <p className="text-gray-400 mt-4">Drop images here or click to browse</p>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP up to 10MB each</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGenerate}
              disabled={isLoading || !prompt.trim()}
              className="relative group w-full overflow-hidden rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
              
              <div className="relative px-8 py-5 bg-gradient-to-r from-pink-500/90 via-purple-500/90 to-cyan-500/90 backdrop-blur-xl">
                <div className="flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <IconSpark />
                      </motion.div>
                      <span className="text-white font-black text-lg">AI is Creating...</span>
                    </>
                  ) : (
                    <>
                      <IconBanana />
                      <span className="text-white font-black text-lg">
                        {conversationId ? 'Continue Generation' : 'Generate Image'}
                      </span>
                      <IconMagic />
                    </>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="p-4 rounded-2xl border border-red-500/30 bg-red-900/20 backdrop-blur-xl"
                >
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Output Area */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-6 space-y-6"
            >
              {/* Output Display */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-3xl opacity-30 blur-lg"></div>
                
                <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">AI Output</h3>
                    {conversationId && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 rounded-full border border-purple-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-purple-300 font-medium">Session Active</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="aspect-square bg-gray-900/50 border border-purple-500/20 rounded-2xl flex items-center justify-center overflow-hidden">
                    {resultImage ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full h-full"
                      >
                        <img 
                          src={resultImage} 
                          className="w-full h-full object-contain" 
                          alt="AI Generated"
                        />
                        {/* Download button */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = resultImage;
                            link.download = `nano-banana-${Date.now()}.png`;
                            link.click();
                          }}
                          className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-black/70 transition-all"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.button>
                      </motion.div>
                    ) : (
                      <div className="text-center p-8">
                        <IconBanana />
                        <p className="text-gray-500 mt-4 text-sm">Your AI creation will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {conversationId && (
                    <div className="mt-4 p-3 bg-purple-900/20 rounded-xl border border-purple-500/20">
                      <p className="text-xs text-purple-300">
                        <span className="font-semibold">Conversation ID:</span> {conversationId.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Continue the conversation for coherent results</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <IconSpark />
                  About Nano Banana
                </h4>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-0.5">•</span>
                    <span>Gemini 2.5 Flash Image - Google's latest AI model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Less censorship compared to other models</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>Faster generation with better quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Supports complex prompts and multiple images</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }
      `}</style>
    </div>
  );
}

export default GeminiImageChatPage;