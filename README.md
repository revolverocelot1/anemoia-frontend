# Anemoia WebGL Studio

<div align="center">
  <img src="public/A_logo.png" alt="Anemoia Logo" width="120" />
  
  **Advanced GPU-accelerated AI tools powered by WebGL and WebGPU**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
  [![React](https://img.shields.io/badge/react-18.3.1-61dafb.svg)](https://reactjs.org)
  [![Three.js](https://img.shields.io/badge/three.js-0.172.0-black.svg)](https://threejs.org)
  
  [Live Demo](https://anemoia.onrender.com) | [Documentation](#documentation) | [Contributing](#contributing)
</div>

## 🌟 Features

- **🚀 GPU Acceleration**: Harness WebGL and WebGPU for real-time AI processing
- **🤖 AI-Powered Tools**: Depth mapping, pose estimation, image upscaling, and more
- **🎨 Interactive 3D Background**: Futuristic solar system with camera controls
- **⚡ Real-time Processing**: Instant results with GPU-optimized shaders
- **🎮 Immersive UI/UX**: Star Wars-inspired design with glassmorphism effects
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **3D Graphics**: Three.js + React Three Fiber
- **Styling**: Tailwind CSS with custom animations
- **Build Tool**: Vite
- **AI Runtime**: ONNX Runtime Web + TensorFlow.js
- **Authentication**: Supabase
- **Deployment**: Render.com

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL 2.0 support
- GPU with updated drivers

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd anemoia-webgl-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 📖 Documentation

### Project Structure

```
src/
├── components/        # Reusable UI components
├── pages/            # Page components (routes)
├── three/            # 3D background components
├── services/         # API and external services
├── utils/            # Utility functions
├── workers/          # Web Workers for AI processing
├── context/          # React Context providers
└── types/            # TypeScript type definitions
```

### Available Tools

#### 🎯 3D Depth Mapping (`/depth-map`)
Real-time depth estimation using WebGL shaders and MiDaS neural networks. Extract 3D information from 2D images with GPU acceleration.

#### 🏃 Pose Estimation (`/pose-estimation`)
WebGL-powered human pose detection using MoveNet Thunder. Track 17 keypoints in real-time with hardware-accelerated tensor operations.

#### 🔍 AI Upscaling (`/upscaler`)
GPU-accelerated image enhancement using Real-ESRGAN. Upscale images 4x with WebGL compute shaders for instant results.

#### 🌐 3D Splat Viewer (`/splat-viewer`)
WebGL renderer for Gaussian Splats, Triangle Splats, and PLY meshes. Experience cutting-edge 3D reconstruction.

#### 🔄 Image Comparison (`/compare`)
WebGL-based side-by-side comparison with GPU-accelerated transitions and shader-based blend modes.

### 3D Background System

The interactive 3D solar system background features:

- **🎮 Camera Controls**: Zoom, pan, and rotate with mouse/touch
- **🪐 9 Planets**: All solar system planets with Star Wars-inspired names
- **🌙 Moons & Rings**: Dynamic moon systems and planetary rings
- **⭐ Star Field**: Thousands of animated stars
- **🎨 Visual Effects**: Glowing sun, planet trails, holographic grid
- **⚡ Performance Modes**: Automatic optimization for devices

#### Keyboard Shortcuts

- `Ctrl/Cmd + B`: Toggle 3D background on/off

#### Camera Controls

- **Mouse**: Click and drag to rotate
- **Scroll**: Zoom in/out
- **Right Click + Drag**: Pan the view
- **Touch**: Pinch to zoom, drag to rotate

### Performance Optimization

The app includes automatic performance detection and optimization:

```javascript
// GPU Detection
const gpuInfo = await detectGPU();
console.log('GPU Tier:', gpuInfo.tier);

// Performance modes
- High: All effects enabled (desktop with good GPU)
- Low: Reduced effects (mobile/low-end devices)
```

### Deployment

The app is optimized for deployment on Render.com with:

- Automatic WebGL fallbacks
- GPU capability detection
- Performance mode switching
- Error boundaries for 3D content

## 🐛 Troubleshooting

### 3D Background Not Visible

1. **Check if enabled**: Press `Ctrl+B` to toggle
2. **Verify WebGL support**: Check browser console for errors
3. **Update GPU drivers**: Ensure latest graphics drivers
4. **Try different browser**: Chrome/Edge recommended

### Performance Issues

1. **Disable 3D background**: Press `Ctrl+B`
2. **Close other GPU-intensive apps**
3. **Check GPU usage in Task Manager**
4. **Use Chrome's hardware acceleration**

### WebGL Context Lost

The app handles context loss automatically, but you can force recovery:
```javascript
window.location.reload();
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Guidelines

1. **Code Style**: Follow ESLint configuration
2. **Components**: Use TypeScript and functional components
3. **Performance**: Test on low-end devices
4. **Accessibility**: Ensure keyboard navigation works

### Adding New Tools

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Create ToolCard on HomePage
4. Implement worker if needed in `src/workers/`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Three.js community for amazing 3D graphics library
- ONNX Runtime team for WebGL acceleration
- React Three Fiber for declarative 3D
- All contributors and testers

## 📞 Support

- **Website**: [anemoias.me](https://anemoias.me)
- **Email**: support@anemoia.dev

---

<div align="center">
  Made with ❤️ by the Anemoia Team
  
  ⭐ Star us on GitHub!
</div>
