import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editImageWithGemini } from '../services/gemini.service';

type Step = 'upload' | 'processing';
type Rotation = 'front' | '60' | '90' | '180';

const ROTATIONS: Rotation[] = ['front', '60', '90', '180'];

const ROTATION_PROMPTS: Record<Rotation, string> = {
  'front': 'I need you to remember every single detail about this person - their exact face shape, facial features, skin tone, hair color and style, body proportions, clothing details, and any accessories. Transform this person into a perfect T-pose: arms extended horizontally at exactly 90 degrees from the body, legs straight and together, neutral expression, looking straight ahead. The entire body must be visible in the frame. This is extremely important: maintain 100% accuracy of all physical features and clothing.',
  '60': 'now 60 degrees',
  '90': 'now 90 degrees', 
  '180': 'now 180 degrees'
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process rotations sequentially when previous one completes
  useEffect(() => {
    if (currentStep === 'processing' && inputFile && conversationId && currentRotationIndex < ROTATIONS.length) {
      const rotation = ROTATIONS[currentRotationIndex];
      const prevRotation = currentRotationIndex > 0 ? ROTATIONS[currentRotationIndex - 1] : null;
      
      // Only process if previous rotation is complete and current hasn't started
      if (!results[rotation] && !processingRotation && (!prevRotation || results[prevRotation])) {
        // Add a small delay to ensure the image is displayed before continuing
        setTimeout(() => {
          processRotation(rotation);
        }, 500);
      }
    }
  }, [currentStep, currentRotationIndex, results, processingRotation, inputFile, conversationId]);

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
    // Automatically start processing
    setCurrentStep('processing');
    // Start first rotation immediately
    setTimeout(() => {
      processRotation('front');
    }, 100);
  };

  const processRotation = async (rotation: Rotation, retryCount = 0) => {
    if (!inputFile) return;
    
    setProcessingRotation(rotation);
    setError(null);

    try {
      const isFirstRotation = rotation === 'front';
      
      const result = await editImageWithGemini({
        prompt: ROTATION_PROMPTS[rotation],
        file: isFirstRotation ? inputFile : undefined,
        inputMimeType: inputFile.type,
        outputMimeType: 'image/png',
        conversationId: isFirstRotation ? undefined : (conversationId || undefined),
        isContinuation: !isFirstRotation
      });

      setResults(prev => ({ ...prev, [rotation]: result.imageBase64 }));
      
      // Store conversation ID from first request
      if (isFirstRotation && result.conversationId) {
        setConversationId(result.conversationId);
        console.log('Started conversation:', result.conversationId);
      }
      
      // Move to next rotation
      if (currentRotationIndex < ROTATIONS.length - 1) {
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
      console.error('Stopping due to error in conversation chain');
    } finally {
      setProcessingRotation(null);
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
      {/* Background with 3D grid effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black"></div>
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-500"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <div className="relative px-6 py-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Icon3DModel />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
              3D T-Pose Generator
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            AI-powered character rotation for 3D modeling workflows
          </p>
        </motion.div>

        {currentStep === 'upload' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-16 text-center overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <motion.div 
                    className="absolute inset-0 transform rotate-45"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
                    }}
                  />
                </div>
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <IconUpload />
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Upload Character Image</h3>
                    <p className="text-gray-400">Drop your image here or click to browse</p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB • Full body preferred</p>
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
            </div>
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

            {/* 3D Viewer Container */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8">
                {/* Rotation Controls */}
                <div className="flex items-center justify-center gap-2 mb-8">
                  {ROTATIONS.map((rotation, index) => {
                    const angle = rotation === 'front' ? 0 : parseInt(rotation);
                    const isActive = processingRotation === rotation;
                    const isComplete = results[rotation] !== null;
                    
                    return (
                      <React.Fragment key={rotation}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`relative ${isActive ? 'z-10' : ''}`}
                        >
                          <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
                            ${isComplete ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50' : 
                              isActive ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 animate-pulse' : 
                              'bg-gray-800/50 border border-gray-700'}
                          `}>
                            {isComplete ? (
                              <motion.svg 
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                width="24" height="24" viewBox="0 0 24 24" fill="none"
                              >
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"/>
                              </motion.svg>
                            ) : (
                              <IconRotate angle={angle} />
                            )}
                          </div>
                          <div className="text-center mt-2">
                            <p className="text-xs font-medium text-gray-400">
                              {rotation === 'front' ? 'Front' : `${rotation}°`}
                            </p>
                          </div>
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-2xl"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1.2, opacity: 0 }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <div className="w-full h-full rounded-2xl border-2 border-cyan-400"></div>
                            </motion.div>
                          )}
                        </motion.div>
                        {index < ROTATIONS.length - 1 && (
                          <div className={`w-16 h-0.5 transition-all duration-500 ${
                            index < currentRotationIndex ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gray-700'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Image Display Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {inputPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="col-span-2 lg:col-span-4 mb-4"
                    >
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-sm"></div>
                        <div className="relative bg-gray-900/80 rounded-2xl p-4 border border-cyan-500/30">
                          <div className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                            Original Input
                          </div>
                          <img 
                            src={inputPreview} 
                            alt="Original" 
                            className="w-full h-48 object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {ROTATIONS.map((rotation, index) => {
                    const isProcessing = processingRotation === rotation;
                    const result = results[rotation];
                    
                    return (
                      <motion.div
                        key={rotation}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative group"
                      >
                        <div className={`
                          absolute -inset-1 rounded-2xl blur-sm transition-all duration-300
                          ${result ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30' : 
                            isProcessing ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30' : 
                            'bg-gray-800/30'}
                        `}></div>
                        
                        <div className="relative bg-gray-900/80 rounded-2xl overflow-hidden border border-gray-700 h-full">
                          <div className="absolute top-3 left-3 z-10">
                            <div className={`
                              px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm
                              ${result ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                                isProcessing ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 
                                'bg-gray-800/50 text-gray-500 border border-gray-700'}
                            `}>
                              {rotation === 'front' ? 'FRONT' : `${rotation}°`}
                            </div>
                          </div>
                          
                          <div className="aspect-[3/4] flex items-center justify-center p-4">
                            {result ? (
                              <motion.img
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={`data:image/png;base64,${result}`}
                                alt={`${rotation} view`}
                                className="w-full h-full object-contain"
                              />
                            ) : isProcessing ? (
                              <div className="text-center">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  className="w-16 h-16 mx-auto mb-3"
                                >
                                  <Icon3DModel />
                                </motion.div>
                                <p className="text-sm text-cyan-300">Generating...</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 text-gray-600">
                                  <Icon3DModel />
                                </div>
                                <p className="text-sm text-gray-500">Waiting...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Status Messages */}
                <AnimatePresence mode="wait">
                  {processingRotation && (
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
                            Processing {processingRotation === 'front' ? 'T-Pose transformation' : `${processingRotation}° rotation`}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Using Gemini 2.5 Flash for high-quality results
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
                        }}
                        className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                      >
                        Process Another Image
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TPoseToolPage;