# Face Swap ONNX Runtime Fix Guide

## Problem
The current error occurs because ONNX Runtime Web tries to dynamically import modules that Vite cannot resolve properly:
```
Failed to fetch dynamically imported module: /ort-wasm/ort-wasm-simd-threaded.jsep.mjs?import
```

## Solution Options

### Option 1: Use CDN (Quickest Fix)
Add to `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js"></script>
```

Then update `FaceSwapEngine.ts`:
```typescript
// Use global ort from CDN
const ort = window.ort;
```

### Option 2: Copy ONNX Runtime Files Correctly
1. Install the postinstall script in package.json is already set up
2. Run `npm install` to copy files
3. Ensure these files exist in `/public/ort-wasm/`:
   - ort-wasm-simd-threaded.wasm
   - ort-wasm-simd.wasm
   - ort-wasm.wasm
   - ort-wasm-threaded.wasm

### Option 3: Use Web Worker (Recommended)
Create a web worker for ONNX Runtime inference to avoid module loading issues:

`src/face-swap/workers/onnx.worker.ts`:
```typescript
import * as ort from 'onnxruntime-web';

self.addEventListener('message', async (e) => {
  const { type, data } = e.data;
  
  switch (type) {
    case 'loadModel':
      // Load model in worker
      break;
    case 'runInference':
      // Run inference in worker
      break;
  }
});
```

### Option 4: Vite Configuration
Update `vite.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  optimizeDeps: {
    include: ['onnxruntime-web'],
    esbuildOptions: {
      target: 'es2020',
      format: 'esm'
    }
  },
  build: {
    commonjsOptions: {
      include: [/onnxruntime-web/]
    }
  }
});
```

## Testing the Fix

1. Clear browser cache and IndexedDB
2. Run `npm run dev`
3. Navigate to `/face-swap`
4. Select "Balanced" or "High Quality" mode
5. Click "Initialize Face Swap"
6. Check console for successful model loading

## Temporary Workaround

While fixing ONNX Runtime loading, users can:
1. Use "Fast" mode (demo mode) which doesn't require ONNX Runtime
2. This provides a working face swap simulation
3. Allows testing the UI and workflow

## Long-term Solution

Consider migrating to:
1. TensorFlow.js which has better Vite compatibility
2. MediaPipe Face Detection API
3. Custom WebAssembly module for face detection
4. Server-side processing with API calls 