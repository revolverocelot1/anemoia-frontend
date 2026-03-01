# Face Swap Model Setup Guide

## Overview

This face swap implementation uses InsightFace's inswapper model for high-quality face swapping. The models are required for real face swapping functionality (not the demo mode).

## Required Models

### 1. Face Detection Model
- **Model**: BlazeFace ONNX
- **Size**: ~10MB
- **Purpose**: Detects face locations in images
- **Download**: [blazeface.onnx](https://github.com/onnx/models/tree/main/vision/body_analysis/ultraface)

### 2. Face Landmarks Model
- **Model**: Face Landmarks 68 points
- **Size**: ~5MB
- **Purpose**: Detects facial landmarks for alignment
- **Download**: [face_landmarks_68.onnx](https://github.com/onnx/models/tree/main/vision/body_analysis/facial_landmark)

### 3. Face Swap Model (Main)
- **Model**: inswapper_128.onnx
- **Size**: ~120MB
- **Purpose**: The main face swapping model from InsightFace
- **Download Options**:
  - From HuggingFace: https://huggingface.co/deepinsight/inswapper/resolve/main/inswapper_128.onnx
  - Alternative: https://github.com/facefusion/facefusion-assets/releases/download/models/inswapper_128.onnx

### 4. Face Enhancement Model (Optional)
- **Model**: GFPGAN or CodeFormer
- **Size**: ~50MB
- **Purpose**: Enhances face quality after swapping
- **Download**: [gfpgan_lite.onnx](https://github.com/xinntao/GFPGAN)

## Installation Steps

### Step 1: Create Model Directory
```bash
# In your project root
mkdir -p public/models/face-swap
```

### Step 2: Download Models

#### Option A: Manual Download
1. Download each model from the links above
2. Place them in `public/models/face-swap/` directory

#### Option B: Using Script
```bash
# Run the download script
node scripts/download-face-swap-models.js
```

### Step 3: Verify Model Files
Ensure these files exist:
- `public/models/face-swap/blazeface.onnx`
- `public/models/face-swap/face_landmarks_68.onnx`
- `public/models/face-swap/inswapper_128.onnx`
- `public/models/face-swap/gfpgan_lite.onnx` (optional)

## Model Quality Modes

### Demo Mode (No download required)
- Uses simulated face swapping
- Good for testing UI/UX
- No real face swapping

### Standard Mode (~50MB)
- Uses lightweight models
- Faster processing
- Good quality results

### Premium Mode (~150MB)
- Uses full inswapper_128 model
- Best quality results
- Slower processing

## Troubleshooting

### Model Loading Errors
1. Check browser console for specific error messages
2. Verify model files are in correct location
3. Ensure CORS headers are set for model files

### Performance Issues
1. Use Chrome/Edge for best WebGL support
2. Enable hardware acceleration in browser
3. Close other browser tabs
4. Consider using Standard mode instead of Premium

### CORS Issues
If hosting models on CDN, ensure proper CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

## Legal Notice

These models are for research and educational purposes. Please respect the original licenses:
- InsightFace models: [InsightFace License](https://github.com/deepinsight/insightface)
- GFPGAN: [GFPGAN License](https://github.com/xinntao/GFPGAN)

## Alternative: Demo Mode

If you don't want to download models, you can use Demo Mode which provides:
- Instant loading
- UI/UX testing
- Simulated face swap effects
- No actual face swapping

To use Demo Mode, select "Demo Mode" when the app starts. 