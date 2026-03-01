import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editImageWithGemini } from '../services/gemini.service';
import { useNavigate } from 'react-router-dom';

type Step = 'upload' | 'processing';
type Rotation = 'front' | '60' | '90' | '180';
type ProcessingMode = 'chain' | 'separate';

const ROTATIONS: Rotation[] = ['front', '60', '90', '180'];

// Chain mode prompts - short prompts that rely on conversation context
const CHAIN_PROMPTS: Record<Rotation, string> = {
  'front': 'I need you to remember every single detail about this person - their exact face shape, facial features, skin tone, hair color and style, body proportions, clothing details, and any accessories. Transform this person into a perfect T-pose: arms extended horizontally at exactly 90 degrees from the body, legs straight and together, neutral expression, looking straight ahead. The entire body must be visible in the frame. This is extremely important: maintain 100% accuracy of all physical features and clothing.',
  '60': 'now rotate the same person to 60 degrees while maintaining the T-pose',
  '90': 'now rotate the same person to 90 degrees (side view) while maintaining the T-pose', 
  '180': 'now rotate the same person to 180 degrees (back view) while maintaining the T-pose'
};

// Separate mode prompts - detailed prompts for each angle
const SEPARATE_PROMPTS: Record<Rotation, string> = {
  'front': 'Transform this person into a perfect T-pose viewed from the FRONT: arms extended horizontally at exactly 90 degrees from the body, legs straight and together, neutral expression, looking straight ahead. The entire body must be visible in the frame. Maintain 100% accuracy of all physical features, face shape, skin tone, hair color and style, body proportions, clothing details, and accessories.',
  '60': 'Transform this person into a perfect T-pose rotated 60 DEGREES: arms extended horizontally at exactly 90 degrees from the body, legs straight and together, body rotated 60 degrees to show a three-quarter view. The entire body must be visible in the frame. Maintain 100% accuracy of all physical features, face shape, skin tone, hair color and style, body proportions, clothing details, and accessories.',
  '90': 'Transform this person into a perfect T-pose viewed from the SIDE (90 degrees): arms extended horizontally at exactly 90 degrees from the body, legs straight and together, showing a complete profile/side view. The entire body must be visible in the frame. Maintain 100% accuracy of all physical features, body proportions, clothing details, and accessories.',
  '180': 'Transform this person into a perfect T-pose viewed from the BACK (180 degrees): do a T pose, legs straight and together, showing the complete back view. The entire body must be visible in the frame. Maintain 100% accuracy of all physical features, hair style from behind, body proportions, clothing details from the back, and any visible accessories.'
};

// Custom 3D-styled icons as SVG components
const Icon3DModel = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 9.5L17.5 4.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
  </svg>
);

const IconSpark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="currentColor"/>
  </svg>
);

const IconMagicWand = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 4V2M15 16V14M9 9L10.5 7.5M16.5 16.5L18 15M3 21L12 12M12 4L14 2M4 14L2 12M12 12L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 7L19 8M5 18L4 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRotate = ({ angle }: { angle: number }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.g 
      animate={{ rotate: angle }} 
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 8L20 12L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </motion.g>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">{angle}°</text>
  </svg>
);

const IconUpload = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path 
      d="M24 32V16M24 16L18 22M24 16L30 22" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
    />
    <motion.rect 
      x="8" y="8" width="32" height="32" rx="8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeDasharray="5 5"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
  </svg>
);

function TPoseToolPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [results, setResults] = useState<Record<Rotation, string | null>>({
    'front': null,
    '60': null,
    '90': null,
    '180': null
  });
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0);
  const [processingRotation, setProcessingRotation] = useState<Rotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('separate');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [showApiKeyDisclaimer, setShowApiKeyDisclaimer] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start processing when entering processing mode
  useEffect(() => {
    if (currentStep === 'processing' && inputFile && !isProcessingAll && currentRotationIndex === 0 && !processingRotation && !results.front) {
      console.log('Starting processing from useEffect, mode:', processingMode);
      startProcessing();
    }
  }, [currentStep, inputFile, processingMode]);

  // Process subsequent rotations for chain mode only
  useEffect(() => {
    if (processingMode !== 'chain' || !isProcessingAll) return;
    
    console.log('[Chain Mode] Rotation effect triggered:', {
      currentRotationIndex,
      conversationId,
      processingRotation
    });
    
    // Need conversation ID to continue
    if (!conversationId && currentRotationIndex > 0) {
      console.log('[Chain Mode] Waiting for conversation ID...');
      return;
    }
    
    if (currentStep === 'processing' && inputFile && currentRotationIndex > 0 && currentRotationIndex < ROTATIONS.length) {
      const rotation = ROTATIONS[currentRotationIndex];
      const prevRotation = ROTATIONS[currentRotationIndex - 1];
      
      // Only process if previous is done and current hasn't started
      if (!results[rotation] && !processingRotation && results[prevRotation] && conversationId) {
        console.log(`[Chain Mode] Processing next: ${rotation}`);
        // Delay to ensure UI updates
        const timer = setTimeout(async () => {
          try {
            await processRotation(rotation);
          } catch (err) {
            console.error(`[Chain Mode] Failed ${rotation}:`, err);
            setError(`Chain mode failed at ${rotation}. Try separate mode.`);
            setIsProcessingAll(false);
          }
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, currentRotationIndex, results, processingRotation, inputFile, conversationId, processingMode, isProcessingAll]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setInputFile(file);
    const url = URL.createObjectURL(file);
    setInputPreview(url);
    setError(null);
    // Reset results for new image
    setResults({
      'front': null,
      '60': null,
      '90': null,
      '180': null
    });
    setCurrentRotationIndex(0);
    setConversationId(null);
    setIsProcessingAll(false);
    // Don't automatically start processing - wait for mode selection
  };

  const startProcessing = async () => {
    if (!inputFile) return;
    
    setCurrentStep('processing');
    setIsProcessingAll(true);
    setError(null);
    
    if (processingMode === 'separate') {
      // Process all rotations independently
      console.log('Starting separate mode processing');
      
      // Process each rotation with proper error handling
      for (let i = 0; i < ROTATIONS.length; i++) {
        const rotation = ROTATIONS[i];
        try {
          console.log(`[Separate Mode] Processing ${rotation}...`);
          await processRotation(rotation);
          // Wait a bit between requests
          if (i < ROTATIONS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`[Separate Mode] Failed to process ${rotation}:`, err);
          setError(`Failed to generate ${rotation} view. Retrying...`);
          // Retry once
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await processRotation(rotation);
          } catch (retryErr) {
            console.error(`[Separate Mode] Retry failed for ${rotation}:`, retryErr);
          }
        }
      }
      
      setIsProcessingAll(false);
    } else {
      // Start chain mode with first rotation
      console.log('Starting chain mode processing');
      await processRotation('front');
    }
  };

  const processRotation = async (rotation: Rotation, retryCount = 0) => {
    console.log(`processRotation called for ${rotation}, mode: ${processingMode}, inputFile:`, inputFile);
    if (!inputFile) {
      console.log('No input file, returning');
      return;
    }
    
    setProcessingRotation(rotation);
    if (processingMode === 'chain') {
      setError(null);
    }

    try {
      const isFirstRotation = rotation === 'front';
      const prompts = processingMode === 'chain' ? CHAIN_PROMPTS : SEPARATE_PROMPTS;
      console.log(`Processing ${rotation} rotation, mode: ${processingMode}, isFirstRotation:`, isFirstRotation);
      
      // For separate mode, always send the image with each request
      // For chain mode, only send image on first request
      const shouldSendImage = processingMode === 'separate' || (processingMode === 'chain' && isFirstRotation);
      
      const result = await editImageWithGemini({
        prompt: prompts[rotation],
        file: shouldSendImage ? inputFile : undefined,
        inputMimeType: inputFile.type,
        outputMimeType: 'image/png',
        conversationId: processingMode === 'chain' && !isFirstRotation && conversationId ? conversationId : undefined,
        isContinuation: processingMode === 'chain' && !isFirstRotation
      });

      // Validate that we got an image
      if (!result.imageBase64) {
        throw new Error('No image data returned from API');
      }
      
      console.log(`Successfully generated ${rotation} image`);
      setResults(prev => ({ ...prev, [rotation]: result.imageBase64 }));
      
      // Store conversation ID from first request (chain mode only)
      if (processingMode === 'chain' && isFirstRotation && result.conversationId) {
        setConversationId(result.conversationId);
        console.log('Started conversation for chain mode:', result.conversationId);
      }
      
      // Move to next rotation for chain mode
      if (processingMode === 'chain' && currentRotationIndex < ROTATIONS.length - 1) {
        setCurrentRotationIndex(prev => prev + 1);
      }
    } catch (err: any) {
      console.error(`Error processing rotation ${rotation}:`, err);
      
      // Retry logic for transient failures
      if (retryCount < 2) {
        console.log(`Retrying rotation ${rotation} (attempt ${retryCount + 1}/2)...`);
        setTimeout(() => {
          processRotation(rotation, retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
        return;
      }
      
      // Check if it's an axios error with response data
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to process image';
      setError(`Error on ${rotation} view: ${errorMessage}`);
      
      // Don't continue if conversation fails
      if (processingMode === 'chain') {
        console.error('Stopping chain due to error');
        setIsProcessingAll(false);
      }
    } finally {
      setProcessingRotation(null);
      
      // Check if all done for chain mode
      if (processingMode === 'chain' && currentRotationIndex === ROTATIONS.length - 1) {
        setIsProcessingAll(false);
      }
    }
  };

  const isComplete = useMemo(() => {
    return ROTATIONS.every(r => results[r] !== null);
  }, [results]);

  const progress = useMemo(() => {
    const completed = ROTATIONS.filter(r => results[r] !== null).length;
    return (completed / ROTATIONS.length) * 100;
  }, [results]);

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
                      The T-Poser tool is currently out of commission due to API key exhaustion. We've reached our usage limits for the Nano Banana (Gemini 2.5 Flash) API.
                    </p>
                    <p className="text-neutral-300 text-sm">
                      We're working on obtaining additional API credits. Please check back later or try our other available tools.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => {
                        setShowApiKeyDisclaimer(false);
                        navigate('/');
                      }}
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
      {/* Corner button to navigate to the normal Gemini chat */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => navigate('/image-chat')}
          className="group px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400/50 transition-all duration-300 shadow-lg backdrop-blur-xl"
          aria-label="Open Gemini Image Chat"
        >
          <span className="flex items-center gap-2">
            <IconMagicWand />
            <span>AI Image Chat</span>
          </span>
        </button>
      </div>
      
      {/* Enhanced 3D Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Deep space gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/50 to-black"></div>
        
        {/* Animated grid */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid3d" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="url(#gridGradient)" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
              </stop>
              <stop offset="100%" stopColor="#ff00ff" stopOpacity="0.3">
                <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
              </stop>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid3d)" />
        </svg>
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: '0 0 10px currentColor'
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <div className="relative px-6 py-10 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center relative"
        >
          {/* Animated badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full"
          >
            <IconSpark />
            <span className="text-sm font-semibold text-purple-300">Powered by Gemini 2.5 Flash</span>
          </motion.div>
          
          <div className="relative inline-block mb-6">
            {/* Animated glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-2xl animate-pulse"></div>
            <div className="relative flex items-center gap-4">
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Icon3DModel />
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-black">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">T-Pose</span>
                <br />
                <span className="text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">Generator AI</span>
              </h1>
            </div>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Transform any photo into professional <span className="text-cyan-400 font-semibold">3D-ready T-poses</span> with 
            <span className="text-purple-400 font-semibold"> AI-powered precision</span>. Perfect for game development, animation, and 3D modeling.
          </motion.p>
          
          {/* Feature pills */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mt-8"
          >
            {[
              { icon: "⚡", text: "Lightning Fast", color: "from-yellow-500 to-orange-500" },
              { icon: "🎯", text: "Pixel Perfect", color: "from-cyan-500 to-blue-500" },
              { icon: "🔄", text: "4 Angles", color: "from-purple-500 to-pink-500" },
              { icon: "✨", text: "AI Enhanced", color: "from-emerald-500 to-green-500" }
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

        {currentStep === 'upload' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Enhanced File Upload Area */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              {/* Multi-layer gradient effects */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-3xl opacity-30 blur-xl group-hover:opacity-50 transition-all duration-500"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              
              <div className="relative bg-gradient-to-br from-gray-900/90 via-purple-900/20 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/20 group-hover:border-purple-400/40 p-20 text-center overflow-hidden transition-all duration-300">
                {/* Animated circuit pattern */}
                <div className="absolute inset-0">
                  <svg className="w-full h-full opacity-10">
                    <defs>
                      <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="2" fill="currentColor" className="text-cyan-500">
                          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
                        </circle>
                        <path d="M10 10 L90 10 L90 90" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500"/>
                        <circle cx="90" cy="90" r="2" fill="currentColor" className="text-pink-500">
                          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="1s"/>
                        </circle>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#circuit)"/>
                  </svg>
                </div>
                
                {/* Scanning effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent"
                  animate={{ y: [-200, 200] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="relative z-10 flex flex-col items-center gap-8">
                  {/* Animated upload icon */}
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <IconUpload />
                  </motion.div>
                  
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                      Drop Your Character
                    </h3>
                    <p className="text-gray-300 text-lg max-w-md mx-auto">
                      Upload any photo and watch AI transform it into a perfect T-pose
                    </p>
                    
                    {/* File type badges */}
                    <div className="flex justify-center gap-3 mt-6">
                      {['PNG', 'JPG', 'WEBP'].map((format) => (
                        <span key={format} className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs font-semibold text-purple-300">
                          {format}
                        </span>
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-4">
                      <span className="text-cyan-400">💡 Pro tip:</span> Full body shots work best
                    </p>
                  </div>
                </div>
                
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>
            </motion.div>

            {/* Enhanced Mode Selection */}
            {inputFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="relative"
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 rounded-3xl opacity-40 blur-lg animate-pulse"></div>
                
                <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/30 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-10 overflow-hidden">
                  {/* Animated background texture */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22%23fff%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M0 20L20 0L40 20L20 40z%22%3E%3C/path%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
                  </div>
                  
                  <motion.h3 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-black text-center mb-8 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent"
                  >
                    Select AI Processing Mode
                  </motion.h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Separate Mode - Enhanced */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setProcessingMode('separate')}
                      className={`relative group p-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        processingMode === 'separate' 
                          ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/20' 
                          : 'border-gray-700 bg-gray-900/50 hover:border-cyan-500/50 hover:bg-gray-800/70'
                      }`}
                    >
                      {/* Animated background effect */}
                      {processingMode === 'separate' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                          animate={{ 
                            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                          }}
                          transition={{ duration: 8, repeat: Infinity }}
                        />
                      )}
                      
                      <div className="relative flex flex-col items-center gap-4">
                        <motion.div 
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl"
                          animate={processingMode === 'separate' ? { rotate: [0, 5, -5, 0] } : {}}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="14" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="2" y="14" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="14" y="14" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <motion.circle
                              cx="6" cy="6" r="1.5" fill="currentColor"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <motion.circle
                              cx="18" cy="6" r="1.5" fill="currentColor"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            />
                            <motion.circle
                              cx="6" cy="18" r="1.5" fill="currentColor"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                            />
                            <motion.circle
                              cx="18" cy="18" r="1.5" fill="currentColor"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                            />
                          </svg>
                        </motion.div>
                        <div className="text-center space-y-3">
                          <h4 className="font-black text-xl text-white">Parallel Processing</h4>
                          <motion.div 
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="3" fill="none"/>
                            </svg>
                            <span>RECOMMENDED</span>
                            <IconSpark />
                          </motion.div>
                          <p className="text-sm text-gray-300 leading-relaxed">AI processes all 4 angles simultaneously</p>
                          <div className="flex flex-wrap justify-center gap-2 mt-3">
                            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-lg">✓ 99% Success Rate</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg">✓ Faster Results</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>

                    {/* Chain Mode - Enhanced */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setProcessingMode('chain')}
                      className={`relative group p-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        processingMode === 'chain' 
                          ? 'border-purple-400 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg shadow-purple-500/20' 
                          : 'border-gray-700 bg-gray-900/50 hover:border-purple-500/50 hover:bg-gray-800/70'
                      }`}
                    >
                      {/* Animated chain effect */}
                      {processingMode === 'chain' && (
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.1), transparent)',
                            backgroundSize: '200% 100%'
                          }}
                          animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                      )}
                      
                      <div className="relative flex flex-col items-center gap-4">
                        <motion.div 
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl"
                          animate={processingMode === 'chain' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <motion.path 
                              d="M6 12L10 12M14 12L18 12" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round"
                              strokeDasharray="10 5"
                              animate={{ strokeDashoffset: [0, -15] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2">
                              <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite"/>
                            </circle>
                            <circle cx="18" cy="12" r="3" stroke="currentColor" strokeWidth="2">
                              <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" begin="1s"/>
                            </circle>
                            <circle cx="12" cy="12" r="2" fill="currentColor">
                              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
                            </circle>
                          </svg>
                        </motion.div>
                        <div className="text-center space-y-3">
                          <h4 className="font-black text-xl text-white">Sequential Chain</h4>
                          <motion.div 
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30"
                          >
                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                            <span>EXPERIMENTAL</span>
                          </motion.div>
                          <p className="text-sm text-gray-300 leading-relaxed">AI maintains context between angles</p>
                          <div className="flex flex-wrap justify-center gap-2 mt-3">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-lg">⚡ Memory Chain</span>
                            <span className="px-2 py-1 bg-pink-500/20 text-pink-300 text-xs font-semibold rounded-lg">🎨 Better Consistency</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  </div>

                  {/* Enhanced Start Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startProcessing}
                    className="relative group w-full mt-8 overflow-hidden rounded-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>
                    
                    <div className="relative px-8 py-5 bg-gradient-to-r from-cyan-500/90 via-purple-500/90 to-pink-500/90 backdrop-blur-xl">
                      <div className="flex items-center justify-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                          <IconMagicWand />
                        </motion.div>
                        <span className="text-white font-black text-lg tracking-wide">
                          Generate T-Pose Angles
                        </span>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Preview */}
                  {inputPreview && (
                    <div className="mt-6 flex justify-center">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur-sm"></div>
                        <img 
                          src={inputPreview} 
                          alt="Selected" 
                          className="relative w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {currentStep === 'processing' && (
          <div className="space-y-8">
            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Generation Progress</span>
                <span className="text-sm font-bold text-cyan-400">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Enhanced 3D Viewer Container */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              {/* Multi-layer gradient effects */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-[2rem] blur-3xl animate-pulse"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/30 via-purple-600/30 to-pink-600/30 rounded-3xl blur-xl"></div>
              
              <div className="relative bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-10 overflow-hidden">
                {/* Animated mesh background */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full">
                    <defs>
                      <pattern id="mesh" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M25 0 L50 25 L25 50 L0 25 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500">
                          <animate attributeName="stroke-width" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
                        </path>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#mesh)"/>
                  </svg>
                </div>
                
                {/* Section Header */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-10"
                >
                  <h2 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-2">
                    AI Processing Studio
                  </h2>
                  <p className="text-gray-400">Watch your character transform in real-time</p>
                </motion.div>
                
                {/* Enhanced Rotation Controls */}
                <div className="flex items-center justify-center gap-3 mb-10">
                  {ROTATIONS.map((rotation, index) => {
                    const angle = rotation === 'front' ? 0 : parseInt(rotation);
                    const isActive = processingRotation === rotation;
                    const isComplete = results[rotation] !== null;
                    
                    return (
                      <React.Fragment key={rotation}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0, rotate: -180 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.15, type: "spring" }}
                          className={`relative ${isActive ? 'z-10' : ''}`}
                        >
                          {/* Enhanced progress indicator */}
                          <div className="relative">
                            {/* Background glow */}
                            {(isActive || isComplete) && (
                              <motion.div
                                className="absolute -inset-2 rounded-2xl blur-xl"
                                animate={{ opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                  background: isComplete 
                                    ? 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)'
                                    : 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)'
                                }}
                              />
                            )}
                            
                            <motion.div 
                              className={`
                                w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden
                                ${isComplete ? 'bg-gradient-to-br from-emerald-500/30 to-green-500/30 border-2 border-emerald-400' : 
                                  isActive ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400' : 
                                  'bg-gray-900/70 border border-gray-700/50'}
                              `}
                              whileHover={{ scale: 1.05 }}
                            >
                              {/* Animated background pattern */}
                              {isActive && (
                                <motion.div
                                  className="absolute inset-0 opacity-30"
                                  style={{
                                    backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(6,182,212,0.3) 50%, transparent 70%)',
                                    backgroundSize: '200% 200%'
                                  }}
                                  animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                              
                              {isComplete ? (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", bounce: 0.5 }}
                                >
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 drop-shadow-lg"/>
                                    <motion.circle
                                      cx="12" cy="12" r="10"
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      fill="none"
                                      className="text-emerald-400/30"
                                      initial={{ pathLength: 0 }}
                                      animate={{ pathLength: 1 }}
                                      transition={{ duration: 0.5 }}
                                    />
                                  </svg>
                                </motion.div>
                              ) : (
                                <div className="relative">
                                  <IconRotate angle={angle} />
                                  {isActive && (
                                    <motion.div
                                      className="absolute inset-0 flex items-center justify-center"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    >
                                      <div className="w-full h-full border-2 border-cyan-400/30 rounded-xl border-dashed"></div>
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          </div>
                          
                          {/* Enhanced label */}
                          <motion.div 
                            className="text-center mt-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.15 + 0.3 }}
                          >
                            <p className={`text-sm font-bold ${
                              isComplete ? 'text-emerald-400' : 
                              isActive ? 'text-cyan-400' : 
                              'text-gray-500'
                            }`}>
                              {rotation === 'front' ? 'Front' : `${rotation}°`}
                            </p>
                            {isActive && (
                              <p className="text-xs text-cyan-300 mt-1">Processing...</p>
                            )}
                          </motion.div>
                          
                          {/* Active pulse effect */}
                          {isActive && (
                            <>
                              <motion.div
                                className="absolute inset-0 rounded-2xl border-2 border-cyan-400"
                                initial={{ scale: 0.8, opacity: 0.8 }}
                                animate={{ scale: 1.3, opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                              <motion.div
                                className="absolute inset-0 rounded-2xl border border-cyan-300"
                                initial={{ scale: 0.9, opacity: 0.6 }}
                                animate={{ scale: 1.2, opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                              />
                            </>
                          )}
                        </motion.div>
                        {index < ROTATIONS.length - 1 && (
                          <div className="relative w-20 h-8 flex items-center">
                            <div className={`absolute w-full h-1 transition-all duration-700 rounded-full ${
                              index < currentRotationIndex 
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                                : 'bg-gray-800'
                            }`}>
                              {index < currentRotationIndex && (
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ duration: 0.5 }}
                                  style={{ transformOrigin: 'left' }}
                                />
                              )}
                            </div>
                            {/* Animated dots */}
                            {processingMode === 'chain' && index === currentRotationIndex - 1 && (
                              <motion.div
                                className="absolute left-0 w-full flex justify-between"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                {[0, 1, 2].map((dot) => (
                                  <motion.div
                                    key={dot}
                                    className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                                    animate={{ 
                                      x: [0, 20, 40, 60, 80],
                                      opacity: [0, 1, 1, 1, 0]
                                    }}
                                    transition={{ 
                                      duration: 1.5,
                                      repeat: Infinity,
                                      delay: dot * 0.2
                                    }}
                                  />
                                ))}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Enhanced Image Display Grid */}
                <div className="space-y-8">
                  {/* Original Image Display */}
                  {inputPreview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring" }}
                      className="relative"
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-gray-300">Original Input</h3>
                      </div>
                      
                      <div className="relative group max-w-md mx-auto">
                        {/* Animated border gradient */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500"></div>
                        
                        <div className="relative bg-gradient-to-br from-gray-900/95 to-purple-900/20 rounded-3xl p-6 border border-purple-500/30 overflow-hidden">
                          {/* Scan line effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"
                            animate={{ y: [-200, 200] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          />
                          
                          <div className="relative">
                            <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                              <motion.div
                                className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Source</span>
                            </div>
                            
                            <img 
                              src={inputPreview} 
                              alt="Original" 
                              className="w-full h-64 object-contain rounded-2xl"
                            />
                            
                            {/* Grid overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-10">
                              <svg className="w-full h-full">
                                <defs>
                                  <pattern id="grid-overlay" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-500"/>
                                  </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#grid-overlay)"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Results Grid */}
                  <div>
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-300">Generated T-Poses</h3>
                      <p className="text-sm text-gray-500 mt-1">AI-generated character rotations</p>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {ROTATIONS.map((rotation, index) => {
                        const isProcessing = processingRotation === rotation;
                        const result = results[rotation];
                        
                        return (
                          <motion.div
                            key={rotation}
                            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ delay: index * 0.15, type: "spring" }}
                            className="relative group"
                          >
                            {/* Enhanced card with holographic effect */}
                            <div className={`
                              absolute -inset-2 rounded-3xl transition-all duration-500
                              ${result ? 'bg-gradient-to-br from-emerald-500/40 via-cyan-500/40 to-blue-500/40 blur-xl' : 
                                isProcessing ? 'bg-gradient-to-br from-cyan-500/40 via-purple-500/40 to-pink-500/40 blur-xl animate-pulse' : 
                                'bg-gray-800/20 blur-sm'}
                            `}></div>
                            
                            <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-950/50 to-gray-900/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-purple-500/30 group-hover:border-purple-400/50 transition-all duration-300 h-full">
                              {/* Holographic shimmer */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                              </div>
                              
                              {/* Status badge */}
                              <div className="absolute top-4 left-4 z-10">
                                <motion.div 
                                  className={`
                                    px-4 py-2 rounded-xl text-xs font-black backdrop-blur-xl flex items-center gap-2
                                    ${result ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-400/40' : 
                                      isProcessing ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-300 border border-cyan-400/40' : 
                                      'bg-gray-900/70 text-gray-500 border border-gray-700/50'}
                                  `}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {result && <IconSpark />}
                                  {isProcessing && (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/>
                                      </svg>
                                    </motion.div>
                                  )}
                                  <span>{rotation === 'front' ? 'FRONT' : `${rotation}°`}</span>
                                </motion.div>
                              </div>
                              
                              {/* Download button for completed images */}
                              {result && (
                                <motion.button
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `data:image/png;base64,${result}`;
                                    link.download = `t-pose-${rotation}.png`;
                                    link.click();
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </motion.button>
                              )}
                              
                              <div className="aspect-[3/4] flex items-center justify-center p-6">
                                {result ? (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.3 }}
                                    className="relative w-full h-full"
                                  >
                                    <img
                                      src={`data:image/png;base64,${result}`}
                                      alt={`${rotation} view`}
                                      className="w-full h-full object-contain rounded-xl"
                                    />
                                    {/* Success overlay effect */}
                                    <motion.div
                                      initial={{ opacity: 1 }}
                                      animate={{ opacity: 0 }}
                                      transition={{ duration: 1, delay: 0.5 }}
                                      className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-xl pointer-events-none"
                                    />
                                  </motion.div>
                                ) : isProcessing ? (
                                  <div className="text-center">
                                    <motion.div
                                      animate={{ 
                                        rotate: 360,
                                        scale: [1, 1.1, 1]
                                      }}
                                      transition={{ 
                                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                                        scale: { duration: 2, repeat: Infinity }
                                      }}
                                      className="w-20 h-20 mx-auto mb-4 relative"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full opacity-20 blur-xl"></div>
                                      <div className="relative text-cyan-400">
                                        <Icon3DModel />
                                      </div>
                                    </motion.div>
                                    <motion.p 
                                      className="text-sm font-semibold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                      AI Processing...
                                    </motion.p>
                                  </div>
                                ) : (
                                  <div className="text-center opacity-50">
                                    <div className="w-16 h-16 mx-auto mb-3 text-gray-600">
                                      <Icon3DModel />
                                    </div>
                                    <p className="text-sm text-gray-500">Queued</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                <AnimatePresence mode="wait">
                  {(processingRotation || (processingMode === 'separate' && isProcessingAll && !isComplete)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-6 p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Icon3DModel />
                        </motion.div>
                        <div>
                          <p className="text-cyan-300 font-medium">
                            {processingMode === 'separate' && isProcessingAll && !processingRotation 
                              ? 'Processing all angles in parallel...'
                              : `Processing ${processingRotation === 'front' ? 'T-Pose transformation' : `${processingRotation}° rotation`}`
                            }
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Mode: {processingMode === 'chain' ? 'Sequential processing' : 'Parallel processing'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-red-900/20 rounded-xl border border-red-500/30"
                    >
                      <p className="text-red-300">{error}</p>
                    </motion.div>
                  )}

                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl border border-emerald-500/30"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <motion.path 
                            d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" 
                            fill="currentColor" 
                            className="text-emerald-400"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2 }}
                          />
                        </svg>
                        <span className="text-emerald-300 font-bold text-lg">All rotations complete!</span>
                      </motion.div>
                      <p className="text-gray-400 mt-4">
                        Your 3D T-pose reference set is ready for modeling
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Mode: {processingMode === 'chain' ? 'Chain (Sequential)' : 'Separate (Parallel)'}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setCurrentStep('upload');
                          setInputFile(null);
                          setInputPreview(null);
                          setResults({ 'front': null, '60': null, '90': null, '180': null });
                          setCurrentRotationIndex(0);
                          setConversationId(null);
                          setIsProcessingAll(false);
                        }}
                        className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                      >
                        Process Another Image
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TPoseToolPage;
