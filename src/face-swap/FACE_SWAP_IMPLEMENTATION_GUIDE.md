# Face Swap Implementation Guide

## Overview

This web-based face swap implementation runs entirely in the browser using WebGL, ensuring complete user privacy with no server uploads. The system uses ONNX Runtime Web to execute ML models directly in the browser.

## Quick Start

1. **Install Dependencies**
```bash
npm install onnxruntime-web
```

2. **Download ONNX Runtime WASM Files**
   - Download WASM files from: https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/
   - Place in `public/ort-wasm/` directory

3. **Add Face Swap Models**
   Create `public/models/face-swap/` directory and add:
   - `blazeface.onnx` - Face detection
   - `face_landmarks_68.onnx` - Landmark detection
   - `simswap_256.onnx` or `inswapper_128_fp16.onnx` - Face swapping
   - `gfpgan_lite.onnx` - Optional enhancement

4. **Navigate to Face Swap Page**
   Visit `/face-swap` in your application

## Model Sources

### BlazeFace (Face Detection)
- Convert from TensorFlow.js model: https://github.com/tensorflow/tfjs-models/tree/master/blazeface
- Or use pre-converted ONNX: https://github.com/manthi4/End-to-end-BlazeFace-Onnx

### Face Landmarks
- Use dlib's 68-point model converted to ONNX
- Or MediaPipe Face Mesh converted model

### Face Swap Models
1. **SimSwap** (Recommended for web)
   - Smaller, optimized versions available
   - Good quality/performance balance

2. **inswapper_128_fp16.onnx** (User suggested)
   - Download: https://huggingface.co/ninjawick/webui-faceswap-unlocked/resolve/main/inswapper_128_fp16.onnx
   - Higher quality but larger size (~280MB)

## Usage Flow

1. **Load Models**: Click "Load Models" button to initialize
2. **Upload Images**: 
   - Source: Face to copy
   - Target: Image to swap face into
3. **Configure Settings**:
   - Model Quality: Low/Medium/High
   - Blending Mode: Linear/Feather/Poisson
   - Enhancement: Optional face restoration
4. **Swap Faces**: Click "Swap Faces" to process
5. **Download Result**: Save the output image

## Features

### Core Features
- ✅ Client-side processing (no uploads)
- ✅ Multiple face detection
- ✅ Face alignment and landmarks
- ✅ Advanced blending modes
- ✅ Expression preservation
- ✅ WebGL acceleration

### Advanced Features
- ✅ Progressive model loading
- ✅ IndexedDB caching
- ✅ Multi-face support
- ✅ Face enhancement
- ✅ Performance metrics

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Input Images   │────▶│  Face Detection  │────▶│ Face Alignment  │
└─────────────────┘     │   (BlazeFace)    │     │  (68 Landmarks) │
                        └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Output Image   │◀────│    Blending &    │◀────│   Face Swap     │
└─────────────────┘     │   Enhancement    │     │    (ONNX)       │
                        └──────────────────┘     └─────────────────┘
```

## Optimization Tips

### Model Size Reduction
1. **Quantization**: Convert FP32 → FP16 → INT8
2. **Model Pruning**: Remove unnecessary weights
3. **Dynamic Loading**: Load models on demand

### Performance
1. **Use WebGL Backend**: Enabled by default
2. **Batch Processing**: Process multiple faces together
3. **Texture Caching**: Reuse GPU textures
4. **Web Workers**: Offload preprocessing

### Memory Management
1. **Dispose Tensors**: Clean up after inference
2. **Limit Image Size**: Resize large images
3. **Progressive Enhancement**: Start with low quality

## Troubleshooting

### Common Issues

1. **"Model not found" Error**
   - Ensure models are in `public/models/face-swap/`
   - Check browser console for 404 errors

2. **Slow Performance**
   - Enable WebGL in browser settings
   - Use lower quality mode
   - Reduce image resolution

3. **Out of Memory**
   - Use smaller models
   - Process one face at a time
   - Clear browser cache

### Browser Support
- Chrome 80+ ✅
- Firefox 75+ ✅
- Safari 14+ ✅ (Limited WebGL)
- Edge 80+ ✅

## Security & Privacy

- **No Server Upload**: All processing happens locally
- **No Data Storage**: Images are not saved
- **Model Integrity**: Verify model checksums
- **CORS**: Models must be served from same origin

## Future Enhancements

1. **Video Support**: Real-time face swapping
2. **3D Models**: More realistic swapping
3. **WebGPU**: Next-gen acceleration
4. **Model Compression**: Smaller download sizes

## References

- [ONNX Runtime Web Docs](https://onnxruntime.ai/docs/tutorials/web/)
- [BlazeFace Paper](https://arxiv.org/abs/1907.05047)
- [SimSwap GitHub](https://github.com/neuralchen/SimSwap)
- [FaceFusion](https://github.com/facefusion/facefusion) 