# Anemoia Frontend - Complete Project Documentation

## Project Overview

Anemoia is a comprehensive web-based media manipulation toolkit that provides AI-powered tools for video editing, image processing, and 3D visualization. Built with React, TypeScript, and modern web technologies.

## Main Features & Sub-Features

### 1. AI Subtitle Editor (`/subtitle`)
**Purpose**: Generate and edit subtitles for videos using AI transcription

#### Sub-Features:
- **AI Transcription**: 
  - Uses Whisper AI models (tiny, base, small, medium, large)
  - Multiple language support with auto-detection
  - Real-time progress tracking
  - Model caching for faster subsequent use
  
- **Subtitle Editing**:
  - Visual timeline with waveform display
  - Segment-based editing with timestamps
  - Multi-track support for different languages
  - Keyboard shortcuts for efficient editing
  
- **Styling System**:
  - Font customization (family, size, weight, style)
  - Color controls for text, background, and outline
  - Position presets (9 positions on screen)
  - Interactive drag-and-drop positioning
  - Shadow and outline effects
  - Background transparency control
  
- **Import/Export**:
  - Import: SRT, VTT, ASS formats
  - Export: SRT, VTT, ASS formats
  - Burn subtitles into video (MP4/WebM output)
  
- **Video Preview**:
  - Real-time subtitle overlay
  - Frame-accurate seeking
  - Resizable video container

#### Flow:
1. User uploads video → Video loaded into player
2. Audio extracted from video → Waveform generated
3. User selects Whisper model → Model downloaded/loaded
4. Transcription process → Segments created with timestamps
5. User edits segments → Real-time preview updates
6. Style customization → Visual changes apply instantly
7. Export options → Download subtitle file or burned video

### 2. Image Comparison Tool (`/compare`)
**Purpose**: Compare two images side-by-side with various visualization methods

#### Sub-Features:
- Slider comparison view
- Overlay with opacity control
- Difference visualization
- Side-by-side view
- Zoom and pan controls
- Pixel-level analysis (SSIM, PSNR metrics)

### 3. Depth Map Generator (`/depth-map`)
**Purpose**: Generate depth maps from 2D images using AI

#### Sub-Features:
- Multiple depth estimation models
- 3D visualization of depth data
- Export as grayscale depth image
- Adjustable depth range
- Real-time preview

### 4. AI Image Upscaler (`/upscaler`)
**Purpose**: Enhance image resolution using AI models

#### Sub-Features:
- RealESRGAN model integration
- 2x, 4x, 8x upscaling options
- Batch processing support
- Before/after comparison
- Multiple model variants for different content types

### 5. Pose Estimation (`/pose-estimation`)
**Purpose**: Detect and visualize human poses in images

#### Sub-Features:
- Multi-person pose detection
- Skeleton overlay visualization
- Keypoint confidence scores
- Export pose data as JSON
- Support for various pose models

### 6. 3D Gaussian Splatting Viewer (`/splat-viewer`)
**Purpose**: View and interact with 3D Gaussian splatting files

#### Sub-Features:
- PLY file loading
- Interactive 3D navigation
- Rendering quality controls
- Camera position saving
- Export viewpoints

### 7. Face Swap Tool (`/face-swap`)
**Purpose**: Swap faces between images using AI

#### Sub-Features:
- Automatic face detection
- Manual face selection
- Blend mode options
- Color correction
- Batch processing

## Subtitle Burning Process - Modern Implementation

### Current Implementation:
The subtitle burning process uses FFmpeg.wasm to overlay subtitles directly onto the video, similar to modern video editors like:
- Adobe Premiere Pro
- DaVinci Resolve
- Final Cut Pro

### How It Works:
1. **ASS Format Generation**: Subtitles are converted to Advanced SubStation Alpha (ASS) format which supports:
   - Rich text formatting
   - Custom positioning
   - Animation effects
   - Multiple styles per subtitle

2. **Video Processing Pipeline**:
   ```
   Original Video → FFmpeg → Video Filter (ass=subs.ass) → Output Video
   ```

3. **Optimization Strategies**:
   - Single-pass encoding when possible
   - Hardware acceleration detection
   - Chunked processing for large files
   - Progress tracking with ETA

### Why It's Slow:
- **Browser Limitations**: Running FFmpeg in WebAssembly is inherently slower than native
- **Memory Constraints**: Limited by browser memory allocation
- **No GPU Acceleration**: WASM doesn't have direct GPU access
- **Re-encoding Required**: Must decode and re-encode entire video

### Potential Improvements:
1. **Server-Side Processing**: Offload to backend with native FFmpeg
2. **WebCodecs API**: Use browser's native video encoding (when available)
3. **Segment-Only Encoding**: Only re-encode frames with subtitles
4. **Lower Quality Preview**: Fast preview mode with final quality export

## Common Errors & Solutions

### 1. "Failed to resolve module specifier '@huggingface/transformers'"
**Cause**: Direct ES module import in non-module context
**Solution**: Import through Vite/webpack bundler, not raw HTML

### 2. "Pipeline creation failed: no available backend found"
**Cause**: ONNX Runtime not properly initialized before transformers.js
**Solution**: Import and configure onnxruntime-web before transformers

### 3. "TypeError: Cannot read properties of undefined (reading 'wasm')"
**Cause**: ONNX Runtime env structure not guaranteed
**Solution**: Add null checks and create structure if missing

### 4. "Unexpected token '<', "<!DOCTYPE..." is not valid JSON"
**Cause**: CORS issues or network blocking model downloads
**Solution**: 
- Check internet connection
- Disable ad blockers
- Use VPN if on corporate network
- Implement retry logic

### 5. "Failed to load video: undefined"
**Cause**: Video element not properly initialized
**Solution**: Wait for video metadata before processing

### 6. Slow subtitle burning
**Cause**: Browser-based video encoding limitations
**Solution**: 
- Use smaller video files
- Lower output quality
- Implement chunked processing
- Show accurate progress with ETA

## Technical Architecture

### Frontend Stack:
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Zustand**: State management
- **TailwindCSS**: Styling
- **Three.js**: 3D graphics
- **FFmpeg.wasm**: Video processing
- **Transformers.js**: AI models
- **ONNX Runtime**: Model inference

### Key Libraries:
- `@huggingface/transformers`: Whisper models
- `@ffmpeg/ffmpeg`: Video processing
- `onnxruntime-web`: ONNX model runtime
- `framer-motion`: Animations
- `react-rnd`: Resizable components

### Worker Architecture:
- Dedicated workers for AI processing
- Message-based communication
- Progress tracking
- Error handling with retries

## Performance Optimizations

1. **Model Caching**: Cache downloaded models in browser storage
2. **Lazy Loading**: Load features only when accessed
3. **Web Workers**: Offload heavy computation
4. **Chunked Processing**: Process large files in segments
5. **Debouncing**: Limit UI updates during processing

## Security Considerations

1. **CORS Headers**: Required for model downloads and video processing
2. **CSP**: Content Security Policy for WASM execution
3. **Local Processing**: All data processed client-side
4. **No Server Upload**: Privacy-first approach

## Future Enhancements

1. **Backend Processing**: Optional server-side processing for faster exports
2. **WebGPU Support**: Hardware acceleration for AI models
3. **Plugin System**: Extensible architecture for custom tools
4. **Collaborative Editing**: Real-time multi-user support
5. **Mobile Support**: Responsive design and touch controls

## Development Guidelines

1. **Error Handling**: Always provide user-friendly error messages
2. **Progress Feedback**: Show progress for long operations
3. **Accessibility**: ARIA labels and keyboard navigation
4. **Performance**: Profile and optimize critical paths
5. **Testing**: Unit tests for utilities, integration tests for features

## Deployment Requirements

1. **CORS Headers**: Enable for WASM and model files
2. **HTTPS**: Required for some browser APIs
3. **Memory**: Recommend 4GB+ RAM for video processing
4. **Browser Support**: Chrome/Edge 90+, Firefox 88+, Safari 15+ 