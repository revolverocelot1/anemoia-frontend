# 🎮 GPU Setup Guide for Anemoia AI Tools

## 🚀 Getting Maximum Performance from Your GPU

This guide will help you enable and optimize GPU acceleration for Anemoia's AI tools, ensuring you get the best possible performance for inpainting, upscaling, and other AI features.

## 📊 GPU Performance Tiers

### 🔥 **Tier 1: High Performance (Recommended)**
- **NVIDIA RTX Series**: RTX 4090, 4080, 4070, 3090, 3080, 3070, 3060 Ti
- **NVIDIA GTX 16/20 Series**: GTX 1660 Ti, 1660 Super, RTX 2080, 2070, 2060
- **AMD RX 6000/7000 Series**: RX 7900 XTX, 7800 XT, 6900 XT, 6800 XT, 6700 XT
- **Performance**: ⚡ **50-200ms** inference times, **AOT-GAN** model support

### ⚡ **Tier 2: Good Performance**
- **NVIDIA GTX 10 Series**: GTX 1080 Ti, 1070, 1060
- **AMD RX 5000/Vega Series**: RX 5700 XT, 5600 XT, Vega 64, Vega 56
- **Intel Arc Series**: Arc A770, A750, A580
- **Performance**: 🚀 **200-500ms** inference times, **MI-GAN** optimized

### 📱 **Tier 3: Basic Performance**
- **Intel Integrated Graphics**: UHD Graphics, Iris Xe, Iris Plus
- **AMD Integrated Graphics**: Radeon Graphics, Vega iGPU
- **Older Dedicated GPUs**: GTX 900 series and below
- **Performance**: 💻 **500ms-2s** inference times, **Enhanced CPU fallback**

---

## 🛠️ Browser Setup

### **Chrome/Edge (Recommended)**
1. **Enable WebGPU** (Best performance):
   ```
   chrome://flags/#enable-unsafe-webgpu
   Set to: Enabled
   ```

2. **Enable GPU Acceleration**:
   ```
   chrome://flags/#enable-gpu-rasterization
   Set to: Enabled
   ```

3. **Hardware Acceleration**:
   - Go to `Settings > Advanced > System`
   - Enable "Use hardware acceleration when available"

### **Firefox**
1. **Enable WebGL2**:
   ```
   about:config
   webgl.force-enabled = true
   webgl.disabled = false
   ```

2. **GPU Acceleration**:
   ```
   gfx.webrender.all = true
   layers.acceleration.force-enabled = true
   ```

---

## 🖥️ System Setup

### **Windows (NVIDIA)**

1. **Update GPU Drivers**:
   - Download latest drivers from [NVIDIA.com](https://www.nvidia.com/drivers)
   - Use GeForce Experience for automatic updates
   - Restart after installation

2. **NVIDIA Control Panel Settings**:
   ```
   Manage 3D Settings > Global Settings:
   - Power management mode: Prefer maximum performance
   - OpenGL rendering GPU: Your NVIDIA GPU
   - CUDA - GPUs: Your NVIDIA GPU
   ```

3. **Windows Graphics Settings**:
   ```
   Settings > System > Display > Graphics settings
   - Add your browser (Chrome/Edge)
   - Set to "High performance"
   ```

### **Windows (AMD)**

1. **Update GPU Drivers**:
   - Download from [AMD.com](https://www.amd.com/support)
   - Use AMD Adrenalin for updates
   - Restart after installation

2. **AMD Radeon Settings**:
   ```
   Gaming > Global Settings:
   - Anti-Lag: Enabled
   - Radeon Boost: Enabled
   - GPU Workload: Graphics
   ```

3. **Windows Graphics Settings**:
   - Same as NVIDIA steps above

---

## 🚨 Troubleshooting

### **"Intel Graphics Detected" Warning**

**Problem**: You see a warning about using Intel integrated graphics instead of your dedicated GPU.

**Solutions**:
1. **Check Windows Graphics Settings**:
   ```
   Settings > System > Display > Graphics settings
   Add browser → Choose "High performance" GPU
   ```

2. **NVIDIA/AMD Control Panel**:
   - Set browser to use dedicated GPU
   - Set global setting to prefer dedicated GPU

3. **Update Drivers**: Ensure latest GPU drivers are installed

### **WebGPU Not Available**

**Problem**: Browser doesn't support WebGPU.

**Solutions**:
1. **Update Browser**: Use Chrome 113+ or Edge 113+
2. **Enable Flags**: Follow browser setup steps above
3. **Check Compatibility**: Visit [webgpu.io](https://webgpu.io) to test

---

## 🎯 Expected Performance

### **Inpainting (512x512 image)**
- **High-end GPU**: 50-200ms
- **Mid-range GPU**: 200-500ms  
- **Integrated GPU**: 500ms-2s
- **CPU Fallback**: 2-5s

### **Image Upscaling (2x)**
- **High-end GPU**: 100-500ms
- **Mid-range GPU**: 500ms-1.5s
- **Integrated GPU**: 1-3s
- **CPU Fallback**: 3-10s

---

## 💡 Pro Tips

1. **Optimal Image Sizes**: 512x512, 768x768, 1024x1024 for best performance
2. **Batch Processing**: Process multiple similar images together
3. **Model Selection**: AOT-GAN for quality, MI-GAN for speed
4. **Browser Choice**: Chrome/Edge generally perform better than Firefox
5. **Monitor Temperature**: High GPU temps can cause throttling

---

*This guide is updated regularly as new GPU features and optimizations become available.*
