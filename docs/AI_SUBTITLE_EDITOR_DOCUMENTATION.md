# AI Subtitle Editor - Complete Documentation

## Overview

The AI Subtitle Editor is a web-based tool that uses OpenAI's Whisper AI models to automatically generate and edit subtitles for videos. It provides a modern, professional interface similar to Adobe Premiere Pro or DaVinci Resolve for subtitle creation and styling.

## Features & Capabilities

### 🎯 Core Features

#### AI Transcription Engine
- **Whisper AI Models**: OpenAI's state-of-the-art speech recognition
- **Multiple Model Sizes**: Tiny (39MB), Base (74MB), Small (244MB), Medium (769MB), Large (1550MB)
- **Language Support**: 100+ languages with auto-detection
- **High Accuracy**: Professional-grade transcription quality
- **Offline Processing**: All processing happens in your browser (privacy-first)

#### Advanced Subtitle Editing
- **Visual Timeline**: Waveform display with precise timing controls
- **Segment-Based Editing**: Individual subtitle segments with start/end times
- **Multi-Track Support**: Multiple subtitle tracks for different languages
- **Keyboard Shortcuts**: Professional editing workflow
- **Real-Time Preview**: See changes instantly as you edit

#### Professional Styling System
- **Typography Control**:
  - Font family (Arial, Helvetica, Times, etc.)
  - Font size (8px - 72px)
  - Font weight (normal, bold, etc.)
  - Font style (normal, italic)
- **Color Management**:
  - Text color with hex picker
  - Background color with transparency
  - Outline/stroke color and width
  - Shadow effects with offset and blur
- **Positioning System**:
  - 9-point positioning grid (top-left, center, bottom-right, etc.)
  - Interactive drag-and-drop positioning
  - Precise pixel-level adjustments
  - Safe area guidelines

#### Import/Export Capabilities
- **Import Formats**: SRT, VTT, ASS subtitle files
- **Export Formats**: 
  - SRT (SubRip Text)
  - VTT (WebVTT)
  - ASS (Advanced SubStation Alpha)
  - MP4/WebM (burned-in subtitles)
- **Video Output**: Export video with permanently burned subtitles

### 🎨 User Interface Design

#### Modern Dark Theme
- Glass-morphism design elements
- Smooth animations and transitions
- Responsive layout for all screen sizes
- Accessibility-compliant color contrast

#### Three-Panel Layout
1. **Left Panel**: Video player with subtitle overlay
2. **Center Panel**: Timeline with waveform visualization
3. **Right Panel**: Tabbed interface (Transcription, Editor, Style)

#### Interactive Components
- **Resizable Video Container**: Drag to resize video preview
- **Timeline Scrubbing**: Click/drag to navigate video
- **Segment Selection**: Click segments to edit
- **Live Style Preview**: See changes in real-time

## Technical Implementation

### Architecture Overview
```
Frontend (React + TypeScript)
├── Video Player (HTML5 Video API)
├── Audio Processing (Web Audio API)
├── AI Processing (Web Workers)
│   ├── Whisper Models (Transformers.js)
│   └── ONNX Runtime (WebAssembly)
├── Subtitle Engine (Custom)
└── Video Export (FFmpeg.wasm)
```

### Key Technologies
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **Transformers.js**: Hugging Face AI models in browser
- **ONNX Runtime**: AI model inference engine
- **FFmpeg.wasm**: Video processing in browser
- **Web Workers**: Background AI processing
- **Canvas API**: Subtitle rendering and positioning

### AI Processing Pipeline
1. **Audio Extraction**: Extract audio from video using Web Audio API
2. **Model Loading**: Download and initialize Whisper model (cached locally)
3. **Chunked Processing**: Split long audio into 30-second segments
4. **AI Transcription**: Process each chunk through Whisper AI
5. **Post-Processing**: Merge chunks, align timestamps, clean text
6. **Segment Creation**: Create editable subtitle segments

### Video Export Process
1. **Subtitle Conversion**: Convert to ASS format for rich styling
2. **FFmpeg Processing**: Use filter graph to burn subtitles
3. **Encoding Options**: H.264 (MP4) or VP9 (WebM)
4. **Optimization**: Adaptive quality based on file size
5. **Download**: Blob creation and browser download

## Usage Flow

### Step 1: Video Upload
```
User Action: Click "Select Video" button
System: Load video file into HTML5 video element
Result: Video appears in preview pane with controls
```

### Step 2: Audio Analysis
```
System: Extract audio channel from video
Process: Generate waveform visualization
Result: Timeline shows audio waveform
```

### Step 3: Model Selection & Loading
```
User Action: Select Whisper model (tiny recommended for first use)
System: Download model from Hugging Face (~39MB for tiny)
Process: Initialize ONNX Runtime and load model
Result: "Model Loaded" status indicator
```

### Step 4: AI Transcription
```
User Action: Click "Transcribe" button
System: Process audio through Whisper AI
Process: Real-time progress updates with ETA
Result: Subtitle segments appear in timeline and editor
```

### Step 5: Editing & Styling
```
User Actions: 
- Click segments to edit text
- Adjust timing with drag handles
- Apply styling (font, color, position)
- Use keyboard shortcuts for efficiency
Result: Professional-quality subtitles
```

### Step 6: Export
```
Options:
- Download subtitle files (SRT/VTT/ASS)
- Burn subtitles into video (MP4/WebM)
Result: Shareable video or subtitle files
```

## Common Issues & Troubleshooting

### ❌ Model Loading Errors

#### Error: "Pipeline creation failed: no available backend found"
**Symptoms**: Model fails to load, WASM errors in console
**Causes**:
- ONNX Runtime not properly initialized
- WASM files not accessible
- Browser compatibility issues
- Network/CORS problems

**Solutions**:
1. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
2. **Check Internet Connection**: Stable connection required for model download
3. **Disable Ad Blockers**: May block model downloads
4. **Try Different Browser**: Chrome/Edge recommended
5. **Use VPN**: If on corporate network with restrictions
6. **Check DevTools**: Look for specific error messages

#### Error: "Unexpected token '<', DOCTYPE is not valid JSON"
**Symptoms**: JSON parsing errors when loading models
**Cause**: Network/CORS issues preventing model download
**Solutions**:
1. Check network connectivity
2. Disable browser extensions
3. Try incognito/private mode
4. Use different network connection

### ❌ Performance Issues

#### Slow Transcription
**Causes**: Large model size, long video, limited device resources
**Solutions**:
- Use smaller model (tiny/base instead of large)
- Split long videos into shorter segments
- Close other browser tabs
- Ensure sufficient RAM (4GB+ recommended)

#### Browser Crashes
**Causes**: Memory exhaustion, large video files
**Solutions**:
- Use videos under 500MB
- Lower video resolution before upload
- Restart browser periodically
- Monitor memory usage in DevTools

### ❌ Export Problems

#### Slow Video Export
**Causes**: Browser-based video encoding limitations
**Solutions**:
- Use optimized presets (automatically applied)
- Export shorter video segments
- Lower output quality if needed
- Be patient - browser encoding is inherently slower

#### Export Failures
**Causes**: Corrupted video files, unsupported formats
**Solutions**:
- Convert video to MP4 before upload
- Use standard video codecs (H.264)
- Check video file integrity

## Browser Compatibility

### ✅ Fully Supported
- **Chrome 90+**: Best performance, all features
- **Edge 90+**: Excellent compatibility
- **Firefox 88+**: Good support, some performance differences
- **Safari 15+**: Basic support, limited by WebAssembly

### ⚠️ Limited Support
- **Mobile Browsers**: Basic functionality only
- **Older Browsers**: May lack Web Worker or WASM support

### 🚫 Not Supported
- **Internet Explorer**: No modern Web API support
- **Very old browsers**: Missing required APIs

## Performance Optimization Tips

### Model Selection
- **Tiny Model (39MB)**: Fast, good for testing, 32x real-time
- **Base Model (74MB)**: Balanced speed/accuracy, 16x real-time
- **Small Model (244MB)**: Better accuracy, 6x real-time
- **Medium/Large**: Best accuracy, slower processing

### Video Preparation
- **Resolution**: 1080p maximum recommended
- **Duration**: Under 30 minutes for best performance
- **Format**: MP4 with H.264 codec preferred
- **Audio**: Clear audio improves transcription accuracy

### Browser Optimization
- **Close Unused Tabs**: Frees memory for processing
- **Disable Extensions**: Reduces interference
- **Use Incognito Mode**: Clean environment for processing

## Advanced Features

### Keyboard Shortcuts
- **Space**: Play/pause video
- **Left/Right Arrow**: Navigate by frame
- **Shift + Left/Right**: Navigate by 10 seconds
- **Enter**: Edit selected segment
- **Escape**: Cancel editing
- **Ctrl+S**: Save project (auto-save)
- **Ctrl+Z**: Undo last action

### Multi-Language Support
- **Language Detection**: Automatic language identification
- **Force Language**: Override detection for specific language
- **Translation Mode**: Translate to English while transcribing
- **Multiple Tracks**: Different languages on separate tracks

### Quality Settings
- **Temperature**: Controls AI creativity/consistency
- **Beam Size**: Search width for better accuracy
- **Chunk Length**: Segment size for processing
- **Stride Length**: Overlap between segments

## Limitations & Constraints

### Technical Limitations
1. **Browser Memory**: Limited by available RAM
2. **Processing Speed**: Slower than native applications
3. **Model Size**: Larger models require more resources
4. **Internet Dependency**: Models download from internet
5. **No GPU Acceleration**: Limited to CPU processing

### File Size Limits
- **Video Files**: 500MB recommended maximum
- **Audio Quality**: Higher quality = slower processing
- **Duration**: 2+ hour videos may cause memory issues

### Accuracy Considerations
- **Audio Quality**: Clear audio essential for accuracy
- **Background Noise**: Reduces transcription quality
- **Multiple Speakers**: May not distinguish speakers
- **Accents**: Some accents may be less accurate

## Future Enhancements

### Planned Features
1. **Server-Side Processing**: Optional backend for faster processing
2. **Real-Time Transcription**: Live transcription during video playback
3. **Speaker Diarization**: Identify and separate multiple speakers
4. **Custom Model Training**: Train on specific domains/accents
5. **Collaborative Editing**: Multi-user editing sessions
6. **Mobile App**: Native mobile application
7. **Cloud Sync**: Save projects to cloud storage
8. **Advanced Analytics**: Transcription accuracy metrics

### Performance Improvements
1. **WebGPU Support**: Hardware acceleration when available
2. **Streaming Processing**: Handle large files without full loading
3. **Progressive Downloads**: Stream models instead of full download
4. **Background Processing**: Continue work while transcribing

## Support & Resources

### Getting Help
1. **Error Console**: Check browser DevTools for specific errors
2. **Network Tab**: Monitor model downloads and API calls
3. **Memory Usage**: Monitor RAM usage during processing
4. **Community Forums**: Share issues and solutions

### Best Practices
1. **Start Small**: Test with short videos and tiny model
2. **Good Audio**: Use videos with clear, high-quality audio
3. **Stable Network**: Ensure reliable internet for model downloads
4. **Regular Saves**: Projects auto-save, but export regularly
5. **Resource Management**: Close other apps during processing

### Technical Requirements
- **RAM**: 4GB minimum, 8GB+ recommended
- **Internet**: Broadband for model downloads
- **Browser**: Modern browser with WASM support
- **Storage**: 2GB free space for model caching

---

## Conclusion

The AI Subtitle Editor represents cutting-edge web technology, bringing professional AI-powered subtitle generation directly to your browser. While there are inherent limitations in browser-based processing, it offers unparalleled convenience and privacy by keeping all your data local.

For best results, use clear audio, stable internet, and modern hardware. Start with the tiny model for testing, then upgrade to larger models for production work.

The tool continues to evolve with new features and optimizations, making professional subtitle creation accessible to everyone. 